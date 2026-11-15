import { beforeEach, describe, expect, it } from "vitest";
import {
  changesAfter,
  createTestExercise,
  createTestUser,
  lastChangeSeq,
  prisma,
  resetDb,
} from "../../test/db.js";
import * as workoutService from "../workout/workout.service.js";
import { PlanService } from "../plan/plan.service.js";
import { ExerciseService } from "../exercise/exercise.service.js";

/**
 * Dziennik zmian (wyzwalacze z migracji add_sync_changes).
 * Zapisy idą przez istniejące serwisy, czyli tak, jak robi to PWA: testy
 * dowodzą, że dziennik powstaje bez żadnych zmian w kodzie tych ścieżek.
 */

const simplify = (rows: Awaited<ReturnType<typeof changesAfter>>) =>
  rows.map((r) => `${r.scopeUserId ?? "*"}:${r.entity}:${r.entityId}`);

describe("sync_changes: wyzwalacze", () => {
  beforeEach(async () => {
    await resetDb();
  });

  describe("treningi, pozycje, serie", () => {
    it("loguje utworzenie treningu i zmianę aktywnego treningu w profilu", async () => {
      const user = await createTestUser();
      const workout = await workoutService.createWorkout(user.id, { workoutName: "A" });

      expect(simplify(await changesAfter())).toEqual([
        `${user.id}:workout:${workout.id}`,
        `${user.id}:profile:${user.id}`,
      ]);
    });

    it("loguje pozycję, serię i ich edycję z zasięgiem właściciela treningu", async () => {
      const user = await createTestUser();
      const exercise = await createTestExercise(null);
      const workout = await workoutService.createWorkout(user.id, {});
      const before = await lastChangeSeq();

      const item = await workoutService.addExerciseToWorkout(workout.id, user.id, { exerciseId: exercise.id });
      const set = await workoutService.addSetToWorkoutItem(item!.id, user.id, { weight: 50, repetitions: 5 });
      await workoutService.updateWorkoutSet(set.id, user.id, { weight: 55 });

      const logged = simplify(await changesAfter(before));
      expect(logged).toContain(`${user.id}:workoutItem:${item!.id}`);
      expect(logged).toContain(`${user.id}:workoutSet:${set.id}`);
      expect(logged.filter((l) => l === `${user.id}:workoutSet:${set.id}`).length).toBeGreaterThanOrEqual(2);
      expect(logged.every((l) => l.startsWith(`${user.id}:`))).toBe(true);
    });

    it("loguje notatkę oczekującą po zmianie notatki ćwiczenia", async () => {
      const user = await createTestUser();
      const exercise = await createTestExercise(null);
      const workout = await workoutService.createWorkout(user.id, {});
      const item = await workoutService.addExerciseToWorkout(workout.id, user.id, { exerciseId: exercise.id });
      const before = await lastChangeSeq();

      await workoutService.updateWorkoutItem(item!.id, user.id, { notes: "łokcie wąsko" });

      expect(simplify(await changesAfter(before))).toEqual(
        expect.arrayContaining([
          `${user.id}:workoutItem:${item!.id}`,
          `${user.id}:pendingNote:${exercise.id}`,
        ]),
      );
    });

    it("usunięcie serii i pozycji loguje każdy rekord", async () => {
      const user = await createTestUser();
      const exercise = await createTestExercise(null);
      const workout = await workoutService.createWorkout(user.id, {});
      const item = await workoutService.addExerciseToWorkout(workout.id, user.id, { exerciseId: exercise.id });
      const setA = await workoutService.addSetToWorkoutItem(item!.id, user.id, { weight: 50, repetitions: 5 });
      const setB = await workoutService.addSetToWorkoutItem(item!.id, user.id, { weight: 50, repetitions: 5 });
      const before = await lastChangeSeq();

      await workoutService.deleteWorkoutSet(setA.id, user.id);
      await workoutService.deleteWorkoutItem(item!.id, user.id);

      const logged = simplify(await changesAfter(before));
      expect(logged).toContain(`${user.id}:workoutSet:${setA.id}`);
      expect(logged).toContain(`${user.id}:workoutItem:${item!.id}`);
      // Seria B znika kaskadowo po pozycji, której już nie ma: bez własnego wpisu.
      expect(logged).not.toContain(`${user.id}:workoutSet:${setB.id}`);
    });

    it("usunięcie treningu przez serwis loguje trening (serwis usuwa dzieci jawnie, więc one też trafiają do dziennika)", async () => {
      const user = await createTestUser();
      const exercise = await createTestExercise(null);
      const workout = await workoutService.createWorkout(user.id, {});
      const item = await workoutService.addExerciseToWorkout(workout.id, user.id, { exerciseId: exercise.id });
      await workoutService.addSetToWorkoutItem(item!.id, user.id, { weight: 50, repetitions: 5 });
      const before = await lastChangeSeq();

      await workoutService.deleteWorkout(workout.id, user.id);

      expect(simplify(await changesAfter(before))).toContain(`${user.id}:workout:${workout.id}`);
    });

    it("kaskadowe usunięcie treningu loguje tylko trening; dzieci odtwarza klient", async () => {
      const user = await createTestUser();
      const exercise = await createTestExercise(null);
      const workout = await workoutService.createWorkout(user.id, {});
      const item = await workoutService.addExerciseToWorkout(workout.id, user.id, { exerciseId: exercise.id });
      await workoutService.addSetToWorkoutItem(item!.id, user.id, { weight: 50, repetitions: 5 });
      const before = await lastChangeSeq();

      // Bezpośrednio w bazie, tak jak przy kaskadzie po usunięciu użytkownika.
      await prisma.workout.delete({ where: { id: workout.id } });

      const logged = simplify(await changesAfter(before));
      expect(logged).toContain(`${user.id}:workout:${workout.id}`);
      expect(logged.some((l) => l.includes(":workoutItem:") || l.includes(":workoutSet:"))).toBe(false);
    });

    it("zakończenie treningu loguje trening i wyczyszczenie aktywnego", async () => {
      const user = await createTestUser();
      const exercise = await createTestExercise(null);
      const workout = await workoutService.createWorkout(user.id, {});
      const item = await workoutService.addExerciseToWorkout(workout.id, user.id, { exerciseId: exercise.id });
      await workoutService.addSetToWorkoutItem(item!.id, user.id, { weight: 50, repetitions: 5 });
      const before = await lastChangeSeq();

      await workoutService.updateWorkout(workout.id, user.id, { status: "COMPLETED", durationSeconds: 60 });

      expect(simplify(await changesAfter(before))).toEqual(
        expect.arrayContaining([`${user.id}:workout:${workout.id}`, `${user.id}:profile:${user.id}`]),
      );
    });
  });

  describe("ćwiczenia", () => {
    it("ćwiczenie prywatne ma zasięg twórcy, globalne zasięg wszystkich", async () => {
      const user = await createTestUser();
      const service = new ExerciseService();
      const mine = await service.createExercise({ name: "Moje", muscleGroups: ["CHEST"], userId: user.id });
      const global = await service.createExercise({ name: "Globalne", muscleGroups: ["BACK"], userId: user.id, isGlobal: true });

      const logged = simplify(await changesAfter());
      expect(logged).toContain(`${user.id}:exercise:${mine.id}`);
      expect(logged).toContain(`*:exercise:${global.id}`);
    });

    it("historyczny twórca '1' jest traktowany jak globalny", async () => {
      await createTestUser({ id: "1" });
      const exercise = await createTestExercise("1");
      expect(simplify(await changesAfter())).toEqual([`*:exercise:${exercise.id}`]);
    });

    it("usunięcie ćwiczenia loguje je oraz pozycje treningów i plany, z których zniknęło", async () => {
      const user = await createTestUser();
      const exercise = await createTestExercise(user.id);
      const keep = await createTestExercise(user.id, "Zostaje");
      const workout = await workoutService.createWorkout(user.id, {});
      const item = await workoutService.addExerciseToWorkout(workout.id, user.id, { exerciseId: exercise.id });
      const set = await workoutService.addSetToWorkoutItem(item!.id, user.id, { weight: 50, repetitions: 5 });
      const plan = await new PlanService().createPlan(
        { name: "Plan A", exerciseIds: [exercise.id, keep.id], isPublic: false },
        user.id,
      );
      const before = await lastChangeSeq();

      await new ExerciseService().deleteExercise(exercise.id, user.id);

      const logged = simplify(await changesAfter(before));
      expect(logged).toContain(`${user.id}:exercise:${exercise.id}`);
      expect(logged).toContain(`${user.id}:workoutItem:${item!.id}`);
      expect(logged).toContain(`${user.id}:plan:${plan.id}`);
      // Seria znika kaskadowo po pozycji: klient usuwa ją razem z pozycją.
      expect(logged).not.toContain(`${user.id}:workoutSet:${set.id}`);
      expect(await prisma.workout.findUnique({ where: { id: workout.id } })).not.toBeNull();
    });
  });

  describe("plany", () => {
    it("plan prywatny: tylko twórca; publiczny i wbudowany: także wszyscy", async () => {
      const user = await createTestUser();
      const admin = await createTestUser({ isAdmin: true });
      const exercise = await createTestExercise(null);
      const service = new PlanService();

      const priv = await service.createPlan({ name: "Prywatny", exerciseIds: [exercise.id], isPublic: false }, user.id);
      const pub = await service.createPlan({ name: "Publiczny", exerciseIds: [exercise.id], isPublic: true }, user.id);
      const builtin = await service.createPlan(
        { name: "Wbudowany", exerciseIds: [exercise.id], isPublic: true, isGlobal: true },
        admin.id,
        true,
      );

      const logged = simplify(await changesAfter());
      expect(logged).toContain(`${user.id}:plan:${priv.id}`);
      expect(logged).not.toContain(`*:plan:${priv.id}`);
      expect(logged).toContain(`${user.id}:plan:${pub.id}`);
      expect(logged).toContain(`*:plan:${pub.id}`);
      expect(logged).toContain(`*:plan:${builtin.id}`);
    });

    it("plan publiczny, który staje się prywatny, jest sygnalizowany wszystkim", async () => {
      const user = await createTestUser();
      const exercise = await createTestExercise(null);
      const service = new PlanService();
      const plan = await service.createPlan({ name: "Publiczny", exerciseIds: [exercise.id], isPublic: true }, user.id);
      const before = await lastChangeSeq();

      await service.updatePlan(plan.id, { isPublic: false }, user.id);

      const logged = simplify(await changesAfter(before));
      expect(logged).toContain(`*:plan:${plan.id}`);
      expect(logged).toContain(`${user.id}:plan:${plan.id}`);
    });

    it("zmiana listy ćwiczeń planu loguje plan", async () => {
      const user = await createTestUser();
      const a = await createTestExercise(null, "A");
      const b = await createTestExercise(null, "B");
      const service = new PlanService();
      const plan = await service.createPlan({ name: "Plan", exerciseIds: [a.id], isPublic: false }, user.id);
      const before = await lastChangeSeq();

      await service.updatePlan(plan.id, { exerciseIds: [b.id, a.id] }, user.id);

      expect(simplify(await changesAfter(before))).toContain(`${user.id}:plan:${plan.id}`);
    });

    it("ulubione logują plan dla użytkownika, który je zmienił", async () => {
      const owner = await createTestUser();
      const fan = await createTestUser();
      const exercise = await createTestExercise(null);
      const service = new PlanService();
      const plan = await service.createPlan({ name: "Publiczny", exerciseIds: [exercise.id], isPublic: true }, owner.id);
      const before = await lastChangeSeq();

      await service.favoritePlan(plan.id, fan.id);
      const afterFavorite = simplify(await changesAfter(before));
      expect(afterFavorite).toEqual([`${fan.id}:plan:${plan.id}`]);

      const mid = await lastChangeSeq();
      await service.unfavoritePlan(plan.id, fan.id);
      expect(simplify(await changesAfter(mid))).toEqual([`${fan.id}:plan:${plan.id}`]);
    });

    it("usunięcie planu loguje plan i treningi, które straciły powiązanie", async () => {
      const user = await createTestUser();
      const exercise = await createTestExercise(null);
      const service = new PlanService();
      const plan = await service.createPlan({ name: "Plan", exerciseIds: [exercise.id], isPublic: false }, user.id);
      const workout = await workoutService.createWorkout(user.id, { workoutPlanId: plan.id });
      const before = await lastChangeSeq();

      await service.deletePlan(plan.id, user.id);

      const logged = simplify(await changesAfter(before));
      expect(logged).toContain(`${user.id}:plan:${plan.id}`);
      expect(logged).toContain(`${user.id}:workout:${workout.id}`);
      const reloaded = await prisma.workout.findUnique({ where: { id: workout.id } });
      expect(reloaded?.workoutPlanId).toBeNull();
    });
  });

  describe("właściwości dziennika", () => {
    it("txid jest wspólny dla zmian z jednej transakcji i rośnie między transakcjami", async () => {
      const user = await createTestUser();
      await workoutService.createWorkout(user.id, {}); // jedna transakcja: trening + profil
      await createTestExercise(user.id);

      const rows = await prisma.syncChange.findMany({ orderBy: { seq: "asc" } });
      expect(rows).toHaveLength(3);
      expect(rows[0]!.txid).toBe(rows[1]!.txid);
      expect(rows[2]!.txid).toBeGreaterThan(rows[1]!.txid);
    });

    it("nie loguje aktualizacji użytkownika, która nie zmienia danych profilu", async () => {
      const user = await createTestUser();
      await prisma.user.update({ where: { id: user.id }, data: { password: "nowy-hash" } });
      expect(await changesAfter()).toHaveLength(0);
    });

    it("usunięcie użytkownika nie zostawia błędów i loguje jego treningi", async () => {
      const user = await createTestUser();
      const workout = await workoutService.createWorkout(user.id, {});
      const before = await lastChangeSeq();

      await prisma.user.delete({ where: { id: user.id } });

      expect(simplify(await changesAfter(before))).toContain(`${user.id}:workout:${workout.id}`);
    });
  });
});
