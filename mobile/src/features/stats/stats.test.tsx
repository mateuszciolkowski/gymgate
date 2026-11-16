import { fireEvent, screen } from "@testing-library/react-native";
import { addItem, addSet, completeWorkout, createWorkout } from "@/db/repositories";
import { seedExercise, setupWorld } from "@/db/testing";
import type { Ctx, Db } from "@/db/types";
import { renderThemed } from "@/ui/testUtils";
import { StatsExerciseScreen } from "./StatsExerciseScreen";
import { StatsScreen } from "./StatsScreen";

const mockRouter = { back: jest.fn(), push: jest.fn() };
jest.mock("expo-router", () => ({ useRouter: () => mockRouter }));
const mockWorld: { ctx: Ctx } = { ctx: null as unknown as Ctx };
jest.mock("@/providers", () => ({
  useDb: () => ({ db: mockWorld.ctx.db, userId: mockWorld.ctx.userId }),
  useDbQuery: (read: (db: Db) => unknown) => read(mockWorld.ctx.db),
}));

const BENCH = "aaaaaaaa-0000-4000-8000-000000000001";
const SQUAT = "aaaaaaaa-0000-4000-8000-000000000002";

function world() {
  const w = setupWorld();
  mockWorld.ctx = w.ctx;
  mockRouter.push.mockClear();
  return w;
}
function day(ctx: Ctx, date: string, ex: string, sets: Array<[number, number]>) {
  const w = createWorkout(ctx, { workoutDate: `${date}T12:00:00.000Z` });
  const item = addItem(ctx, w.id, ex);
  sets.forEach(([weight, repetitions]) => addSet(ctx, item.id, { weight, repetitions }));
  completeWorkout(ctx, w.id, 100);
}

describe("StatsScreen", () => {
  it("shows the empty state and zero tiles without completed workouts", async () => {
    world();
    await renderThemed(<StatsScreen />);
    expect(screen.getByText("Twoje postępy")).toBeOnTheScreen();
    expect(screen.getByText("Brak statystyk. Zakończ pierwszy trening, aby zobaczyć rekordy.")).toBeOnTheScreen();
    expect(screen.getByText("Rekordy osobiste (PR)")).toBeOnTheScreen();
    expect(screen.getByText("wykonanych serii")).toBeOnTheScreen();
  });
  it("lists records descending with comma decimals and switches to current weights", async () => {
    const { db, ctx } = world();
    seedExercise(db, BENCH, "Wyciskanie");
    seedExercise(db, SQUAT, "Przysiad");
    day(ctx, "2026-03-01", BENCH, [[92.5, 5], [60, 8]]);
    day(ctx, "2026-03-08", BENCH, [[50, 8]]);
    day(ctx, "2026-03-09", SQUAT, [[100, 5]]);
    await renderThemed(<StatsScreen />);
    expect(screen.getByText("100 kg")).toBeOnTheScreen();
    expect(screen.getByText("92,5 kg")).toBeOnTheScreen();
    const rows = screen.getAllByTestId(/^stat-row-/);
    expect(rows[0]).toHaveProp("testID", `stat-row-${SQUAT}`);
    await fireEvent.press(screen.getByTestId("stats-mode-current"));
    expect(screen.getByText("Aktualne obciążenia")).toBeOnTheScreen();
    expect(screen.getByText("50 kg")).toBeOnTheScreen(); // first set of the newest bench workout
    expect(screen.queryByText("92,5 kg")).toBeNull();
    await fireEvent.press(screen.getByTestId(`stat-row-${BENCH}`));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: "/stats-exercise", params: { id: BENCH } });
  });
});

describe("StatsExerciseScreen", () => {
  it("shows the tiles, chart and sessions, and re-orders the last 8", async () => {
    const { db, ctx } = world();
    seedExercise(db, BENCH, "Wyciskanie");
    day(ctx, "2026-08-14", BENCH, [[60, 8], [65, 6], [70, 5]]);
    day(ctx, "2026-09-07", BENCH, [[62.5, 8], [67.5, 6], [72.5, 5]]);
    await renderThemed(<StatsExerciseScreen exerciseId={BENCH} />);
    expect(screen.getByText("Wyciskanie")).toBeOnTheScreen();
    expect(screen.getAllByText("72.5 kg").length).toBeGreaterThan(0); // tile (+ chart value)
    expect(screen.getByText("Powt. przy PR")).toBeOnTheScreen();
    expect(screen.getByText("72.5 kg × 5")).toBeOnTheScreen();
    expect(screen.getByTestId("chart-latest")).toHaveTextContent("72.5 kg");
    const sessions = () => screen.getAllByTestId("stats-session");
    expect(sessions()).toHaveLength(2);
    expect(sessions()[0]).toHaveTextContent(/7 wrz 2026/);
    expect(sessions()[0]).toHaveTextContent(/62.5 kg × 8, 67.5 kg × 6, 72.5 kg × 5/);
    await fireEvent.press(screen.getByTestId("stats-order-asc"));
    expect(sessions()[0]).toHaveTextContent(/14 sie 2026/);
    await fireEvent.press(screen.getByTestId("stats-back"));
    expect(mockRouter.back).toHaveBeenCalled();
  });
  it("shows only 8 sessions", async () => {
    const { db, ctx } = world();
    seedExercise(db, BENCH, "Wyciskanie");
    for (let d = 1; d <= 10; d++) day(ctx, `2026-03-${String(d).padStart(2, "0")}`, BENCH, [[50 + d, 5]]);
    await renderThemed(<StatsExerciseScreen exerciseId={BENCH} />);
    expect(screen.getAllByTestId("stats-session")).toHaveLength(8);
  });
  it("empty history: chart placeholder, text and fallback title", async () => {
    world();
    await renderThemed(<StatsExerciseScreen exerciseId="missing" />);
    expect(screen.getByText("Szczegóły ćwiczenia")).toBeOnTheScreen();
    expect(screen.getByText("Wykres pojawi się po zrealizowaniu sesji treningowych")).toBeOnTheScreen();
    expect(screen.getByText("Brak historii dla tego ćwiczenia.")).toBeOnTheScreen();
    expect(screen.getByText("0 kg × 0")).toBeOnTheScreen();
  });
  it("single point still draws the chart", async () => {
    const { db, ctx } = world();
    seedExercise(db, BENCH, "Wyciskanie");
    day(ctx, "2026-03-01", BENCH, [[60, 5]]);
    await renderThemed(<StatsExerciseScreen exerciseId={BENCH} />);
    expect(screen.getByTestId("chart-latest")).toHaveTextContent("60.0 kg");
    expect(screen.getByTestId("chart-svg")).toBeOnTheScreen();
  });
});
