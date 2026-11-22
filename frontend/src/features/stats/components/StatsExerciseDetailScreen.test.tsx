// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { StatsExerciseDetailScreen } from "./StatsExerciseDetailScreen";

const set = (weight: string, repetitions: number, setNumber: number) => ({ weight, repetitions, setNumber });
const workout = (id: string, workoutDate: string, status: string, sets: ReturnType<typeof set>[]) => ({
  id, status, workoutDate, createdAt: workoutDate, items: [{ exerciseId: "ex1", sets }],
});
const workouts = [
  workout("w1", "2026-03-01T12:00:00.000Z", "COMPLETED", [set("100", 5, 1), set("80", 10, 2)]),
  workout("w2", "2026-03-08T12:00:00.000Z", "COMPLETED", [set("60", 12, 1)]),
  workout("w3", "2026-03-09T12:00:00.000Z", "DRAFT", [set("200", 10, 1)]),
];

vi.mock("@/contexts/data", () => ({
  useData: () => ({ workouts }),
  useStatsData: () => ({
    stats: [{ exerciseId: "ex1", maxWeight: "100", maxWeightReps: 5, totalWorkouts: 2, lastWeight: "60", lastReps: 12, exercise: { name: "Wyciskanie" } }],
    getExerciseProgression: () => Promise.resolve({ exerciseId: "ex1", metric: "maxSetWeight", points: [] }),
  }),
}));

describe("StatsExerciseDetailScreen", () => {
  it("shows the best estimated 1RM tile (draft ignored)", () => {
    render(<StatsExerciseDetailScreen exerciseId="ex1" onBack={() => {}} />);
    expect(screen.getByText("Szac. 1RM")).toBeTruthy();
    expect(screen.getByText("116.7 kg")).toBeTruthy();
  });

  it("switches the chart metric and its headline value", () => {
    render(<StatsExerciseDetailScreen exerciseId="ex1" onBack={() => {}} />);
    expect(screen.getByText("Ciężar podnoszony w czasie")).toBeTruthy();
    expect(screen.getByTestId("chart-latest").textContent).toBe("60.0 kg");
    fireEvent.click(screen.getByRole("button", { name: "1RM" }));
    expect(screen.getByText("Szac. 1RM w czasie")).toBeTruthy();
    expect(screen.getByTestId("chart-latest").textContent).toBe("84.0 kg");
    fireEvent.click(screen.getByRole("button", { name: "Objętość" }));
    expect(screen.getByText("Objętość w czasie")).toBeTruthy();
    expect(screen.getByTestId("chart-latest").textContent).toBe("720.0 kg");
  });
});
