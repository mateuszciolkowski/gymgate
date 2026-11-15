import { act, fireEvent, screen } from "@testing-library/react-native";
import { addItem, addSet, createWorkout, getWorkout } from "@/db/repositories";
import { workoutItems, workouts, workoutSets } from "@/db/schema";
import { seedExercise, setupWorld } from "@/db/testing";
import type { Ctx } from "@/db/types";
import { renderThemed } from "@/ui/testUtils";
import { AbandonedWorkoutDialog } from "./AbandonedWorkoutDialog";

const mockWorld: { ctx: Ctx | null } = { ctx: null };
jest.mock("@/providers", () => ({
  useDb: () => ({ db: mockWorld.ctx?.db, userId: "u1" }),
  useAction: () => (run: (ctx: Ctx | null) => unknown) => run(mockWorld.ctx),
}));

// A workout whose activity (workout, item, set) stopped `idleMs` ago; it was started 40 min before that.
function workoutIdleFor(idleMs: number) {
  const { db, ctx } = setupWorld();
  mockWorld.ctx = ctx;
  seedExercise(db, "ex", "Wyciskanie");
  const w = createWorkout(ctx, { workoutName: "Porzucony" });
  const item = addItem(ctx, w.id, "ex");
  const set = addSet(ctx, item.id, { weight: 50, repetitions: 5 });
  const last = new Date(Date.now() - idleMs).toISOString();
  db.update(workouts).set({ createdAt: new Date(Date.now() - idleMs - 40 * 60_000).toISOString(), updatedAt: last }).run();
  db.update(workoutItems).set({ updatedAt: last }).run();
  db.update(workoutSets).set({ updatedAt: last }).run();
  void set;
  return { db, id: w.id };
}

describe("AbandonedWorkoutDialog", () => {
  it("shows after 2 h without activity and finishes with last activity - start, skipping the completion rules", async () => {
    const { db, id } = workoutIdleFor(3 * 3600_000 + 5 * 60_000);
    await renderThemed(<AbandonedWorkoutDialog workout={getWorkout(db, id)!} />);
    expect(screen.getByText("Trening się skończył?")).toBeOnTheScreen();
    expect(screen.getByText("Ostatnia aktywność 3h 5min temu")).toBeOnTheScreen();
    expect(screen.getByText("Porzucony")).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId("abandoned-finish"));
    const done = getWorkout(db, id)!;
    expect(done.status).toBe("COMPLETED");
    expect(done.durationSeconds).toBe(40 * 60);
  });
  it("'Kontynuuj' only closes it; a workout idle for under 2 h shows nothing", async () => {
    const stale = workoutIdleFor(3 * 3600_000);
    const first = await renderThemed(<AbandonedWorkoutDialog workout={getWorkout(stale.db, stale.id)!} />);
    await fireEvent.press(screen.getByTestId("abandoned-continue"));
    expect(getWorkout(stale.db, stale.id)!.status).toBe("DRAFT");
    await act(async () => first.unmount());
    const fresh = workoutIdleFor(30 * 60_000);
    await renderThemed(<AbandonedWorkoutDialog workout={getWorkout(fresh.db, fresh.id)!} />);
    expect(screen.queryByText("Trening się skończył?")).toBeNull();
  });
});
