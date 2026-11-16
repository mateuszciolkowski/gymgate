import { Alert } from "react-native";
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { HttpError, NetworkError } from "@/api";
import { planItems, plans } from "@/db/schema";
import { createPlan, getPlan, listAllPlans } from "@/db/repositories";
import { outboxOps, seedExercise, setupWorld } from "@/db/testing";
import type { Ctx, Db } from "@/db/types";
import { renderThemed } from "@/ui/testUtils";
import { clearDraft, getDraft, appendToDraft } from "./draftStore";
import { HISTORY_UNAVAILABLE_TEXT, loadPlanHistory, type KvStore } from "./planHistoryData";
import { PlanFormScreen } from "./PlanFormScreen";
import { PlansScreen } from "./PlansScreen";
import { moveItem } from "./ReorderList";

jest.mock("react-native-keyboard-controller", () => jest.requireActual("react-native-keyboard-controller/jest"));
jest.mock("@shopify/flash-list", () => ({ FlashList: jest.requireActual("react-native").FlatList }));
// Dragging itself is covered by the Maestro flow; here the grip is a plain view.
jest.mock("react-native-gesture-handler", () => ({ GestureDetector: ({ children }: { children: unknown }) => children, usePanGesture: () => ({}) }));
jest.mock("expo-sqlite/kv-store", () => ({ __esModule: true, default: { getItemSync: () => null, setItemSync: () => undefined } }));
const mockRouter = { back: jest.fn(), canGoBack: () => true, replace: jest.fn(), push: jest.fn() };
jest.mock("expo-router", () => ({ useRouter: () => mockRouter }));
const mockWorld: { ctx: Ctx } = { ctx: null as unknown as Ctx };
jest.mock("@/providers", () => ({
  useDb: () => ({ db: mockWorld.ctx.db, userId: mockWorld.ctx.userId }),
  useDbQuery: (read: (db: Db) => unknown) => read(mockWorld.ctx.db),
  useAction: () => (run: (ctx: Ctx) => unknown) => run(mockWorld.ctx),
  useSession: () => ({ session: { api: {} } }),
}));

function world(isAdmin = false) {
  const w = setupWorld({ isAdmin });
  mockWorld.ctx = w.ctx;
  seedExercise(w.db, "e1", "Wyciskanie");
  seedExercise(w.db, "e2", "Martwy ciąg");
  seedExercise(w.db, "mine", "Moje własne", "u1");
  mockRouter.back.mockClear();
  mockRouter.push.mockClear();
  clearDraft();
  return w;
}
const alertSpy = () => jest.spyOn(Alert, "alert").mockImplementation(() => undefined);

describe("moveItem", () => {
  it("moves one item and ignores bad indexes", () => {
    expect(moveItem(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
    expect(moveItem(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
    expect(moveItem(["a", "b"], 1, 5)).toEqual(["a", "b"]);
  });
});

describe("PlansScreen", () => {
  it("shows the empty state of each tab", async () => {
    world();
    await renderThemed(<PlansScreen />);
    expect(screen.getByText("Brak ulubionych")).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId("plans-tab-mine"));
    expect(screen.getByText("Stwórz swój pierwszy plan treningowy")).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId("plans-tab-builtin"));
    expect(screen.getByText("Brak wbudowanych planów")).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId("plans-tab-community"));
    expect(screen.getByText("Brak publicznych planów społeczności")).toBeOnTheScreen();
  });

  it("favorites an own plan, finds it in 'Ulubione', searches and deletes it after confirmation", async () => {
    const { ctx } = world();
    const plan = createPlan(ctx, { name: "Push dzień", exerciseIds: ["e1", "e2"], isPublic: false });
    await renderThemed(<PlansScreen />);
    await fireEvent.press(screen.getByTestId("plans-tab-mine"));
    expect(screen.getByText("2 ćwiczenia")).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId(`plan-favorite-${plan.id}`));
    expect(getPlan(ctx.db, plan.id)?.isFavorite).toBe(true);
    expect(outboxOps(ctx.db).map((o) => o.type)).toEqual(["plan.create", "plan.favorite"]);
    await fireEvent.press(screen.getByTestId("plans-tab-favorites"));
    await fireEvent.changeText(screen.getByTestId("plans-search"), "zzz");
    expect(screen.queryByTestId(`plan-${plan.id}`)).toBeNull();
    await fireEvent.press(screen.getByTestId("plans-search-clear"));
    expect(screen.getByTestId(`plan-${plan.id}`)).toBeOnTheScreen();

    const spy = alertSpy();
    void fireEvent.press(screen.getByTestId(`plan-delete-${plan.id}`)); // resolves only after the confirm button
    await waitFor(() => expect(spy).toHaveBeenCalled());
    const [, message, buttons] = spy.mock.calls[0]!;
    expect(message).toBe('Usunąć plan "Push dzień"?');
    (buttons as { text: string; onPress?: () => void }[]).find((b) => b.text === "Usuń")!.onPress!();
    await waitFor(() => expect(listAllPlans(ctx.db)).toHaveLength(0));
    spy.mockRestore();
  });

  it("offers 'Duplikuj do moich' (no edit/delete) on a built-in plan and copies it as '(kopia)'", async () => {
    const { ctx } = world();
    const w = { id: "builtin-1" };
    const at = "2026-01-01T00:00:00.000Z";
    ctx.db.insert(plans).values({ id: w.id, name: "Wbudowany", shortName: null, creatorUserId: null, isPublic: true, isFavorite: false, createdAt: at, updatedAt: at }).run();
    ctx.db.insert(planItems).values({ id: "pi-1", planId: w.id, exerciseId: "e1", orderInPlan: 0 }).run();
    await renderThemed(<PlansScreen />);
    await fireEvent.press(screen.getByTestId("plans-tab-builtin"));
    expect(screen.queryByTestId(`plan-edit-${w.id}`)).toBeNull();
    expect(screen.queryByTestId(`plan-delete-${w.id}`)).toBeNull();
    await fireEvent.press(screen.getByTestId(`plan-duplicate-${w.id}`));
    expect(listAllPlans(ctx.db).map((p) => p.name).sort()).toEqual(["Wbudowany", "Wbudowany (kopia)"]);
  });

  it("an admin can edit and delete a built-in plan", async () => {
    const { ctx } = world(true);
    const p = createPlan(ctx, { name: "Globalny", exerciseIds: ["e1"], isPublic: true, isGlobal: true });
    await renderThemed(<PlansScreen />);
    await fireEvent.press(screen.getByTestId("plans-tab-builtin"));
    expect(screen.getByTestId(`plan-edit-${p.id}`)).toBeOnTheScreen();
    expect(screen.getByTestId(`plan-delete-${p.id}`)).toBeOnTheScreen();
  });

  it("expands the exercise list and sorts", async () => {
    const { ctx } = world();
    createPlan(ctx, { name: "Alfa", exerciseIds: ["e1", "e2"], isPublic: false });
    createPlan(ctx, { name: "Beta", exerciseIds: ["e1"], isPublic: false });
    await renderThemed(<PlansScreen />);
    await fireEvent.press(screen.getByTestId("plans-tab-mine"));
    const names = () => screen.getAllByText(/^(Alfa|Beta)$/).map((n) => n.props.children);
    expect(names()).toEqual(["Alfa", "Beta"]);
    await fireEvent.press(screen.getByTestId("plans-sort"));
    await fireEvent.press(screen.getByTestId("plans-sort-za"));
    expect(names()).toEqual(["Beta", "Alfa"]);
    await fireEvent.press(screen.getAllByText("Alfa")[0]!);
    expect(screen.getByText("Martwy ciąg")).toBeOnTheScreen();
  });
});

describe("PlanFormScreen", () => {
  it("validates in the PWA order and shows the error", async () => {
    const { db } = world();
    await renderThemed(<PlanFormScreen />);
    await fireEvent.press(screen.getByTestId("plan-submit"));
    expect(screen.getByText("Nazwa planu musi mieć co najmniej 3 znaki")).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId("plan-name"), "Plan A");
    await fireEvent.press(screen.getByTestId("plan-submit"));
    expect(screen.getByText("Dodaj co najmniej 1 ćwiczenie")).toBeOnTheScreen();
    expect(listAllPlans(db)).toHaveLength(0);
  });

  it("creates a plan from the draft with trimmed names, in the dragged order", async () => {
    const { db } = world();
    await renderThemed(<PlanFormScreen />);
    await fireEvent.changeText(screen.getByTestId("plan-name"), "  Plan A ");
    await fireEvent.changeText(screen.getByTestId("plan-short-name"), " A ");
    await act(async () => appendToDraft("new", { id: "e1", name: "Wyciskanie", muscleGroups: ["CHEST"] }));
    await act(async () => appendToDraft("new", { id: "e2", name: "Martwy ciąg", muscleGroups: ["BACK"] }));
    await act(async () => appendToDraft("new", { id: "e1", name: "Wyciskanie", muscleGroups: ["CHEST"] })); // duplicate ignored
    expect(screen.getByTestId("plan-count")).toHaveTextContent("(2/50)");
    await fireEvent(screen.getByTestId("plan-row-e2"), "accessibilityAction", { nativeEvent: { actionName: "decrement" } });
    await fireEvent.press(screen.getByTestId("plan-submit"));
    const [plan] = listAllPlans(db);
    expect(plan).toMatchObject({ name: "Plan A", shortName: "A", isPublic: false });
    expect(plan!.items.map((i) => i.exerciseId)).toEqual(["e2", "e1"]);
    expect(outboxOps(db)[0]).toMatchObject({ type: "plan.create", exerciseIds: ["e2", "e1"] });
    expect(mockRouter.back).toHaveBeenCalled();
    expect(getDraft("new")).toBeNull();
  });

  it("removes an exercise and refuses a public plan with a private exercise", async () => {
    world();
    await renderThemed(<PlanFormScreen />);
    await fireEvent.changeText(screen.getByTestId("plan-name"), "Plan A");
    await act(async () => appendToDraft("new", { id: "e1", name: "Wyciskanie", muscleGroups: [] }));
    await act(async () => appendToDraft("new", { id: "mine", name: "Moje własne", muscleGroups: [] }));
    await fireEvent.press(screen.getByTestId("plan-public"));
    await fireEvent.press(screen.getByTestId("plan-submit"));
    expect(screen.getByText("Plan publiczny lub globalny nie może zawierać prywatnych ćwiczeń")).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId("plan-row-remove-mine"));
    expect(screen.getByTestId("plan-count")).toHaveTextContent("(1/50)");
    await fireEvent.press(screen.getByTestId("plan-submit"));
    expect(screen.queryByTestId("plan-error")).toBeNull();
  });

  it("shows the local (server-worded) reason when the name is taken", async () => {
    const { ctx } = world();
    createPlan(ctx, { name: "Plan A", exerciseIds: ["e1"], isPublic: false });
    await renderThemed(<PlanFormScreen />);
    await fireEvent.changeText(screen.getByTestId("plan-name"), "Plan A");
    await act(async () => appendToDraft("new", { id: "e1", name: "Wyciskanie", muscleGroups: [] }));
    await fireEvent.press(screen.getByTestId("plan-submit"));
    expect(screen.getByText("Plan with this name already exists")).toBeOnTheScreen();
  });

  it("edits an existing plan (update op) and keeps the draft when the screen is remounted", async () => {
    const { ctx, db } = world();
    const plan = createPlan(ctx, { name: "Plan A", exerciseIds: ["e1"], isPublic: false });
    const first = await renderThemed(<PlanFormScreen editId={plan.id} />);
    await fireEvent.changeText(screen.getByTestId("plan-name"), "Plan B");
    first.unmount();
    await renderThemed(<PlanFormScreen editId={plan.id} />);
    expect(screen.getByTestId("plan-name").props.value).toBe("Plan B");
    expect(screen.getByTestId("plan-history-open")).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId("plan-submit"));
    expect(getPlan(db, plan.id)?.name).toBe("Plan B");
    expect(outboxOps(db).at(-1)).toMatchObject({ type: "plan.update", name: "Plan B" });
  });
});

describe("loadPlanHistory", () => {
  const versions = [{ version: 1, name: "A", shortName: null, isPublic: false, exercises: [], createdAt: "2026-01-01T00:00:00.000Z" }];
  const memory = (): KvStore & { data: Map<string, string> } => {
    const data = new Map<string, string>();
    return { data, getItemSync: (k) => data.get(k) ?? null, setItemSync: (k, v) => void data.set(k, v) };
  };

  it("downloads and keeps a copy for offline use", async () => {
    const store = memory();
    const online = { get: async () => ({ data: versions }), post: async () => undefined } as never;
    expect(await loadPlanHistory(online, store, "u1", "p1")).toEqual({ versions, cached: false });
    const offline = { get: async () => { throw new NetworkError("down"); }, post: async () => undefined } as never;
    expect(await loadPlanHistory(offline, store, "u1", "p1")).toEqual({ versions, cached: true });
  });
  it("says it is unavailable offline without a copy, and passes server refusals through", async () => {
    const offline = { get: async () => { throw new NetworkError("down"); }, post: async () => undefined } as never;
    await expect(loadPlanHistory(offline, memory(), "u1", "p1")).rejects.toThrow(HISTORY_UNAVAILABLE_TEXT);
    const refused = { get: async () => { throw new HttpError(403, "Brak dostępu", null); }, post: async () => undefined } as never;
    await expect(loadPlanHistory(refused, memory(), "u1", "p1")).rejects.toThrow("Brak dostępu");
  });
});
