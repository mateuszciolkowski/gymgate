import { db, runInTx } from "../../config/txContext.js";
import type { Prisma } from "@prisma/client";

interface ProgressionQueryFilters {
  from?: Date;
  to?: Date;
}

/**
 * Optional overrides used only by the sync module (client-supplied primary key and
 * client timestamps). PWA callers never pass them, so their writes are unchanged.
 */
export interface WriteStamp {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const stampData = (stamp?: WriteStamp) => ({
  ...(stamp?.id !== undefined && { id: stamp.id }),
  ...(stamp?.createdAt !== undefined && { createdAt: stamp.createdAt }),
  ...(stamp?.updatedAt !== undefined && { updatedAt: stamp.updatedAt }),
});

export interface ExerciseProgressionPoint {
  workoutId: string;
  workoutDate: Date;
  maxSetWeight: number;
  repetitionsAtMaxSet: number;
  volume: number;
}

export const createWorkout = (data: Prisma.WorkoutCreateInput) => {
  return db().workout.create({
    data,
    include: {
      items: {
        include: {
          exercise: true,
          sets: true,
        },
        orderBy: { orderInWorkout: "asc" },
      },
    },
  });
};

const workoutInclude = {
  items: {
    include: {
      exercise: {
        include: {
          photos: true,
        },
      },
      sets: {
        orderBy: { setNumber: "asc" as const },
      },
    },
    orderBy: { orderInWorkout: "asc" as const },
  },
} satisfies Prisma.WorkoutInclude;

/**
 * Tworzy trening w sposób odporny na wyścig (rapid double/triple-tap, równoległe
 * żądania offline-sync). Blokuje wiersz użytkownika (SELECT ... FOR UPDATE), więc
 * równoległe żądania tego samego usera są serializowane: pierwszy tworzy DRAFT i
 * ustawia activeWorkoutId, kolejne widzą już aktywny trening i go zwracają zamiast
 * tworzyć duplikat.
 *
 * Jeśli `data.clientId` jest ustawiony, dedupe po (userId, clientId) ma pierwszeństwo
 * przed logiką aktywnego treningu — retry offline-sync po timeout/utracie odpowiedzi
 * zawsze zwróci ten sam trening, niezależnie od tego, czy jest on nadal aktywny.
 * Sprawdzenie odbywa się w tej samej transakcji co lock wiersza usera, więc jest
 * odporne na wyścig równoległych retry.
 *
 * @returns workout oraz flagę `reused` (true => zwrócono istniejący rekord)
 */
export const createWorkoutWithActiveGuard = async (
  userId: string,
  data: Prisma.WorkoutCreateInput,
): Promise<{ workout: WorkoutWithItems; reused: boolean }> => {
  return runInTx(async (tx) => {
    // Lock wiersza użytkownika — serializuje równoległe tworzenie treningu.
    await tx.$queryRaw`SELECT id FROM "users" WHERE id = ${userId} FOR UPDATE`;

    if (data.clientId) {
      const existingByClientId = await tx.workout.findUnique({
        where: { userId_clientId: { userId, clientId: data.clientId } },
        include: workoutInclude,
      });
      if (existingByClientId) {
        return { workout: existingByClientId, reused: true };
      }
    }

    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { activeWorkoutId: true },
    });

    if (user?.activeWorkoutId) {
      const active = await tx.workout.findUnique({
        where: { id: user.activeWorkoutId },
        include: workoutInclude,
      });
      // Reużyj tylko jeśli aktywny trening nadal istnieje i jest w trakcie (DRAFT).
      if (active && active.status === "DRAFT") {
        return { workout: active, reused: true };
      }
    }

    const workout = await tx.workout.create({
      data,
      include: workoutInclude,
    });

    await tx.user.update({
      where: { id: userId },
      data: { activeWorkoutId: workout.id },
    });

    return { workout, reused: false };
  });
};

type WorkoutWithItems = Prisma.WorkoutGetPayload<{ include: typeof workoutInclude }>;

export const findWorkoutByClientId = (userId: string, clientId: string) => {
  return db().workout.findUnique({
    where: { userId_clientId: { userId, clientId } },
    include: workoutInclude,
  });
};

export const findWorkoutById = (id: string) => {
  return db().workout.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          exercise: {
            include: {
              photos: true,
            },
          },
          sets: {
            orderBy: { setNumber: "asc" },
          },
        },
        orderBy: { orderInWorkout: "asc" },
      },
    },
  });
};

export const findWorkoutsByUser = (
  userId: string,
  filters?: { status?: "DRAFT" | "COMPLETED"; limit?: number; offset?: number }
) => {
  return db().workout.findMany({
    where: {
      userId,
      ...(filters?.status && { status: filters.status }),
    },
    include: workoutInclude,
    orderBy: { workoutDate: "desc" },
    ...(filters?.limit && { take: filters.limit }),
    ...(filters?.offset !== undefined && { skip: filters.offset }),
  });
};

export const updateWorkout = (id: string, data: Prisma.WorkoutUpdateInput) => {
  return db().workout.update({
    where: { id },
    data,
    include: {
      items: {
        include: {
          exercise: true,
          sets: true,
        },
        orderBy: { orderInWorkout: "asc" },
      },
    },
  });
};

export const deleteWorkout = (id: string) => {
  return runInTx(async (tx) => {
    await tx.workoutSet.deleteMany({
      where: {
        item: {
          workoutId: id,
        },
      },
    });

    await tx.workoutItem.deleteMany({
      where: { workoutId: id },
    });

    return tx.workout.delete({
      where: { id },
    });
  });
};

export const addExerciseToWorkout = (
  workoutId: string,
  exerciseId: string,
  orderInWorkout: number,
  notes?: string
) => {
  return db().workoutItem.create({
    data: {
      workoutId,
      exerciseId,
      orderInWorkout,
      notes: notes ?? null,
    },
    include: {
      exercise: {
        include: {
          photos: true,
        },
      },
      sets: true,
    },
  });
};

// Jeśli `clientId` jest ustawiony, dedupe po (workoutId, clientId) ma pierwszeństwo —
// retry offline-sync po timeout/utracie odpowiedzi zwraca ten sam item zamiast
// tworzyć duplikat. Wyścig równoległych retry (dwie transakcje jednocześnie widzą
// "brak rekordu") kończy się P2002 na unikalnym kluczu — obsługiwane w service.
export const addExerciseToWorkoutWithPendingNote = (
  workoutId: string,
  userId: string,
  exerciseId: string,
  orderInWorkout: number,
  notes?: string,
  clientId?: string,
  stamp?: WriteStamp,
) => {
  return runInTx(async (tx) => {
    if (clientId) {
      const existingByClientId = await tx.workoutItem.findUnique({
        where: { workoutId_clientId: { workoutId, clientId } },
        include: {
          exercise: {
            include: {
              photos: true,
            },
          },
          sets: true,
        },
      });
      if (existingByClientId) {
        return existingByClientId;
      }
    }

    const pendingNote = await tx.exercisePendingNote.findUnique({
      where: {
        userId_exerciseId: {
          userId,
          exerciseId,
        },
      },
      select: {
        note: true,
      },
    });

    const createdItem = await tx.workoutItem.create({
      data: {
        workoutId,
        exerciseId,
        orderInWorkout,
        notes: notes ?? null,
        previousNote: pendingNote?.note ?? null,
        clientId: clientId ?? null,
        ...stampData(stamp),
      },
      include: {
        exercise: {
          include: {
            photos: true,
          },
        },
        sets: true,
      },
    });

    if (pendingNote) {
      await tx.exercisePendingNote.delete({
        where: {
          userId_exerciseId: {
            userId,
            exerciseId,
          },
        },
      });
    }

    return createdItem;
  });
};

export const findWorkoutItemByClientId = (workoutId: string, clientId: string) => {
  return db().workoutItem.findUnique({
    where: { workoutId_clientId: { workoutId, clientId } },
    include: {
      exercise: true,
      sets: {
        orderBy: { setNumber: "asc" },
      },
    },
  });
};

export const findWorkoutItemById = (id: string) => {
  return db().workoutItem.findUnique({
    where: { id },
    include: {
      exercise: true,
      sets: {
        orderBy: { setNumber: "asc" },
      },
    },
  });
};

export const updateWorkoutItem = (
  id: string,
  data: Prisma.WorkoutItemUpdateInput
) => {
  return db().workoutItem.update({
    where: { id },
    data,
    include: {
      exercise: true,
      sets: true,
    },
  });
};

export const deleteWorkoutItem = (id: string) => {
  return db().workoutItem.delete({
    where: { id },
  });
};

export const getMaxOrderInWorkout = async (
  workoutId: string
): Promise<number> => {
  const result = await db().workoutItem.aggregate({
    where: { workoutId },
    _max: { orderInWorkout: true },
  });
  return result._max.orderInWorkout || 0;
};

// Jeśli `clientId` jest ustawiony i wystąpi wyścig równoległych retry offline-sync,
// create() rzuci P2002 na unikalnym kluczu (itemId, clientId) — obsługiwane w service
// przez odczyt istniejącego rekordu (findWorkoutSetByClientId).
export const addSetToWorkoutItem = (
  itemId: string,
  weight: number,
  repetitions: number,
  setNumber: number,
  clientId?: string,
  stamp?: WriteStamp,
) => {
  return db().workoutSet.create({
    data: {
      itemId,
      weight,
      repetitions,
      setNumber,
      clientId: clientId ?? null,
      ...stampData(stamp),
    },
  });
};

export const findWorkoutSetByClientId = (itemId: string, clientId: string) => {
  return db().workoutSet.findUnique({
    where: { itemId_clientId: { itemId, clientId } },
  });
};

export const findWorkoutSetById = (id: string) => {
  return db().workoutSet.findUnique({
    where: { id },
  });
};

export const updateWorkoutSet = (
  id: string,
  data: Prisma.WorkoutSetUpdateInput
) => {
  return db().workoutSet.update({
    where: { id },
    data,
  });
};

export const deleteWorkoutSet = (id: string) => {
  return db().workoutSet.delete({
    where: { id },
  });
};

export const getMaxSetNumber = async (itemId: string): Promise<number> => {
  const result = await db().workoutSet.aggregate({
    where: { itemId },
    _max: { setNumber: true },
  });
  return result._max.setNumber || 0;
};

export const getExerciseStats = (userId: string, exerciseId: string) => {
  return db().exerciseUserStats.findFirst({
    where: {
      userId,
      exerciseId,
      exercise: {
        workoutItems: {
          some: {
            workout: {
              userId,
              status: "COMPLETED",
            },
          },
        },
      },
    },
  });
};

export const getAllUserStats = (userId: string) => {
  return db().exerciseUserStats.findMany({
    where: {
      userId,
      exercise: {
        workoutItems: {
          some: {
            workout: {
              userId,
              status: "COMPLETED",
            },
          },
        },
      },
    },
    include: {
      exercise: true,
    },
    orderBy: { maxWeight: "desc" },
  });
};

export const getStatsOverview = async (userId: string) => {
  const now = new Date();
  const monthAgo = new Date(now);
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  const yearAgo = new Date(now);
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);

  const [workoutsLastMonth, workoutsLastYear, totalSets, totalVolumeRows] =
    await Promise.all([
      db().workout.count({
        where: {
          userId,
          status: "COMPLETED",
          workoutDate: { gte: monthAgo },
        },
      }),
      db().workout.count({
        where: {
          userId,
          status: "COMPLETED",
          workoutDate: { gte: yearAgo },
        },
      }),
      db().workoutSet.count({
        where: {
          item: {
            workout: {
              userId,
              status: "COMPLETED",
            },
          },
        },
      }),
      db().$queryRaw<Array<{ totalVolume: string | number | null }>>`
        SELECT COALESCE(SUM(CAST(ws."weight" AS numeric) * ws."repetitions"), 0) AS "totalVolume"
        FROM "workout_sets" ws
        INNER JOIN "workout_items" wi ON wi."id" = ws."itemId"
        INNER JOIN "workouts" w ON w."id" = wi."workoutId"
        WHERE w."userId" = ${userId}
          AND w."status" = 'COMPLETED'
      `,
    ]);

  const totalVolumeRaw = totalVolumeRows[0]?.totalVolume ?? 0;
  const totalVolume = Number(totalVolumeRaw);

  return {
    workoutsLastMonth,
    workoutsLastYear,
    totalSets,
    totalVolume,
  };
};

export const getExerciseProgression = async (
  userId: string,
  exerciseId: string,
  filters?: ProgressionQueryFilters,
): Promise<ExerciseProgressionPoint[]> => {
  const sets = await db().workoutSet.findMany({
    where: {
      item: {
        exerciseId,
        workout: {
          userId,
          status: "COMPLETED",
          ...(filters?.from || filters?.to
            ? {
                workoutDate: {
                  ...(filters.from ? { gte: filters.from } : {}),
                  ...(filters.to ? { lte: filters.to } : {}),
                },
              }
            : {}),
        },
      },
    },
    select: {
      weight: true,
      repetitions: true,
      item: {
        select: {
          workout: {
            select: {
              id: true,
              workoutDate: true,
            },
          },
        },
      },
    },
    orderBy: [
      {
        item: {
          workout: {
            workoutDate: "asc",
          },
        },
      },
      // workoutDate carries date only (no time) from the workout form, so same-day
      // workouts tie; break ties by actual creation order to keep "last" deterministic.
      {
        item: {
          workout: {
            createdAt: "asc",
          },
        },
      },
      // Deterministic "reps at max weight": the first set with the max weight wins
      // (strict > below), so order sets by setNumber, then createdAt, then id.
      { setNumber: "asc" },
      { createdAt: "asc" },
      { id: "asc" },
    ],
  });

  const byWorkout = new Map<string, ExerciseProgressionPoint>();

  for (const set of sets) {
    const workoutId = set.item.workout.id;
    const weight = Number(set.weight);
    const repetitions = set.repetitions;
    const setVolume = weight * repetitions;
    const existing = byWorkout.get(workoutId);

    if (!existing) {
      byWorkout.set(workoutId, {
        workoutId,
        workoutDate: set.item.workout.workoutDate,
        maxSetWeight: weight,
        repetitionsAtMaxSet: repetitions,
        volume: setVolume,
      });
      continue;
    }

    existing.volume += setVolume;
    if (weight > existing.maxSetWeight) {
      existing.maxSetWeight = weight;
      existing.repetitionsAtMaxSet = repetitions;
    }
  }

  return [...byWorkout.values()].sort(
    (a, b) => a.workoutDate.getTime() - b.workoutDate.getTime(),
  );
};

export const getLastWorkoutNote = async (userId: string, exerciseId: string): Promise<string | null> => {
  const lastItem = await db().workoutItem.findFirst({
    where: {
      exerciseId,
      workout: {
        userId,
        status: "COMPLETED",
      },
    },
    orderBy: [
      { workout: { workoutDate: "desc" } },
      // Same-day workouts tie on workoutDate (date-only); break by creation order.
      { workout: { createdAt: "desc" } },
    ],
    select: { notes: true },
  });
  return lastItem?.notes || null;
};

export const setPendingExerciseNote = (
  userId: string,
  exerciseId: string,
  note: string,
) => {
  return db().exercisePendingNote.upsert({
    where: {
      userId_exerciseId: {
        userId,
        exerciseId,
      },
    },
    create: {
      userId,
      exerciseId,
      note,
    },
    update: {
      note,
    },
  });
};

export const clearPendingExerciseNote = (userId: string, exerciseId: string) => {
  return db().exercisePendingNote.deleteMany({
    where: {
      userId,
      exerciseId,
    },
  });
};

export const upsertExerciseStats = (
  userId: string,
  exerciseId: string,
  data: {
    maxWeight: number;
    maxWeightReps: number;
    maxWeightDate: Date;
    lastWeight: number;
    lastReps: number;
    lastWorkoutDate: Date;
    totalWorkouts?: number;
    lastNote?: string | null;
  }
) => {
  return db().exerciseUserStats.upsert({
    where: {
      userId_exerciseId: {
        userId,
        exerciseId,
      },
    },
    create: {
      userId,
      exerciseId,
      ...data,
      totalWorkouts: data.totalWorkouts || 1,
    },
    update: data,
  });
};

export const deleteExerciseStats = (userId: string, exerciseId: string) => {
  return db().exerciseUserStats.deleteMany({
    where: {
      userId,
      exerciseId,
    },
  });
};

export const setActiveWorkout = (userId: string, workoutId: string) => {
  return db().user.update({
    where: { id: userId },
    data: { activeWorkoutId: workoutId },
  });
};

export const getActiveWorkout = (userId: string) => {
  return db().user.findUnique({
    where: { id: userId },
    select: { activeWorkoutId: true },
  });
};

// Lekkie sprawdzenie statusu treningu — bez ciągnięcia items/sets/photos.
// Używane na często wołanym endpoincie /workouts/active.
export const findWorkoutStatus = (id: string) => {
  return db().workout.findUnique({
    where: { id },
    select: { status: true },
  });
};

export const clearActiveWorkout = (userId: string) => {
  return db().user.update({
    where: { id: userId },
    data: { activeWorkoutId: null },
  });
};

// Czyści wskaźnik aktywnego treningu TYLKO jeśli nadal wskazuje na podany
// (nieaktualny) id. Zapobiega wyścigowi: równoległy createWorkout mógł właśnie
// ustawić nowy aktywny trening, którego nie wolno nam wyzerować.
export const clearActiveWorkoutIfMatches = (userId: string, workoutId: string) => {
  return db().user.updateMany({
    where: { id: userId, activeWorkoutId: workoutId },
    data: { activeWorkoutId: null },
  });
};

export const findWorkoutWithPlan = (id: string) => {
  return db().workout.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      workoutPlanId: true,
      skippedPlanExerciseIds: true,
      items: { select: { exerciseId: true } },
      plan: {
        select: {
          id: true,
          items: {
            select: {
              exerciseId: true,
              orderInPlan: true,
              exercise: { select: { id: true, name: true } },
            },
            orderBy: { orderInPlan: "asc" },
          },
        },
      },
    },
  });
};

export const setSkippedPlanExerciseIds = (
  workoutId: string,
  ids: string[],
  updatedAt?: Date,
) => {
  return db().workout.update({
    where: { id: workoutId },
    data: { skippedPlanExerciseIds: ids, ...(updatedAt !== undefined && { updatedAt }) },
    select: { id: true, skippedPlanExerciseIds: true },
  });
};
