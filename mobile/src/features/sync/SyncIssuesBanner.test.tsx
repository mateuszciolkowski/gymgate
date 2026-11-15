import { fireEvent, screen } from "@testing-library/react-native";
import { addItem, createWorkout } from "@/db/repositories";
import { outbox } from "@/db/schema";
import { seedExercise, setupWorld } from "@/db/testing";
import type { Ctx } from "@/db/types";
import { listOpenIssues, openIssueCount } from "@/sync";
import { markRejected, nextBatch } from "@/sync/outbox";
import { renderThemed } from "@/ui/testUtils";
import { SyncIssuesBanner } from "./SyncIssuesBanner";

const mockWorld: { ctx: Ctx | null } = { ctx: null };
jest.mock("@/providers", () => ({
  useDb: () => ({ db: mockWorld.ctx?.db, userId: "u1" }),
  useAction: () => (run: (ctx: Ctx | null) => unknown) => run(mockWorld.ctx),
}));

function rejectedWorld() {
  const { db, ctx } = setupWorld();
  mockWorld.ctx = ctx;
  seedExercise(db, "ex", "E");
  const w = createWorkout(ctx);
  addItem(ctx, w.id, "ex");
  const [create, add] = nextBatch(db);
  markRejected(db, create!.opId, { code: "validation", error: "Zła data", current: null }, "2026-01-01T12:00:00.000Z");
  markRejected(db, add!.opId, { code: "not_found", error: "nie istnieje", current: null }, "2026-01-01T12:00:00.000Z");
  return db;
}

describe("SyncIssuesBanner", () => {
  it("lists '{akcja} {obiekt}' and the grouped deleted-elsewhere notice", async () => {
    const db = rejectedWorld();
    await renderThemed(<SyncIssuesBanner issues={listOpenIssues(db)} online onHide={jest.fn()} />);
    expect(screen.getByText("Nie udało się zsynchronizować zmian:")).toBeOnTheScreen();
    expect(screen.getByText("· Zapisanie treningu")).toBeOnTheScreen();
    expect(screen.getByText("· Trening został usunięty na innym urządzeniu; 1 niewysłana zmiana pominięto")).toBeOnTheScreen();
  });
  it("'Ponów' re-queues single rejections and drops the deleted-elsewhere ones; 'Zamknij' only hides", async () => {
    const db = rejectedWorld();
    const onHide = jest.fn();
    await renderThemed(<SyncIssuesBanner issues={listOpenIssues(db)} online onHide={onHide} />);
    await fireEvent.press(screen.getByTestId("issues-close"));
    expect(onHide).toHaveBeenCalled();
    expect(openIssueCount(db)).toBe(2);
    await fireEvent.press(screen.getByTestId("issues-retry"));
    expect(openIssueCount(db)).toBe(0);
    expect(nextBatch(db).map((o) => o.type)).toEqual(["workout.create"]);
    expect(db.select().from(outbox).all()).toHaveLength(1);
  });
  it("'Ponów' is disabled offline", async () => {
    const db = rejectedWorld();
    await renderThemed(<SyncIssuesBanner issues={listOpenIssues(db)} online={false} onHide={jest.fn()} />);
    await fireEvent.press(screen.getByTestId("issues-retry"));
    expect(openIssueCount(db)).toBe(2);
  });
});
