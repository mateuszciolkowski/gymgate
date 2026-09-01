// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import "fake-indexeddb/auto";
import React from "react";
import { renderHook, waitFor, act } from "@testing-library/react";

// --- Mock collaborators -----------------------------------------------------
vi.mock("../utils/syncManager", async () => {
  // Prawdziwa implementacja helpera (czyta kolejkę z fake-indexeddb) — testy
  // sprawdzają realne zachowanie guardu chroniącego przed nadpisaniem
  // lokalnych zmian treningu danymi z serwera.
  const { localStore } = await import("../utils/localStore");
  const syncManager = {
    start: vi.fn(),
    stop: vi.fn(),
    onSync: vi.fn(() => () => {}),
    onSyncFailure: vi.fn(() => () => {}),
    onWorkoutNotFound: vi.fn(() => () => {}),
    queueOperation: vi.fn(async () => "op-x"),
    syncNow: vi.fn(async () => {}),
    getIsOnline: vi.fn(() => true),
  };
  return {
    syncManager,
    default: syncManager,
    hasPendingWorkoutMutationsNow: async (workoutId?: string) => {
      const ops = await localStore.getPendingSyncOperations();
      return ops.some((op) => {
        if (op.permanentlyFailed) return false;
        if (
          op.entity !== "workout" &&
          op.entity !== "workoutItem" &&
          op.entity !== "set"
        ) {
          return false;
        }
        if (!workoutId) return true;
        return op.workoutId === workoutId || op.endpoint.includes(workoutId);
      });
    },
  };
});

vi.mock("../utils/auth", () => ({
  authFetch: vi.fn(),
  getAuthHeaders: vi.fn(() => ({ "Content-Type": "application/json" })),
}));

vi.mock("./AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u1", firstName: "T", lastName: "U", email: "t@e.com" },
  }),
}));

import { DataProvider, useData } from "./data";
import { syncManager } from "../utils/syncManager";
import { authFetch } from "../utils/auth";
import { localStore } from "../utils/localStore";

const mockedFetch = authFetch as unknown as ReturnType<typeof vi.fn>;
const mockedSync = syncManager as unknown as Record<string, ReturnType<typeof vi.fn>>;

const makeRes = (status: number, body: unknown = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  clone: () => ({ json: async () => body }),
  json: async () => body,
});

const isWorkoutPost = (url: unknown, opts: unknown) =>
  String(url).endsWith("/api/workouts") &&
  (opts as RequestInit | undefined)?.method === "POST";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <DataProvider>{children}</DataProvider>
);

const renderData = async () => {
  const hook = renderHook(() => useData(), { wrapper });
  // Let the initial load / fetchAllFromServer settle.
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  return hook;
};

beforeEach(async () => {
  vi.clearAllMocks();
  await Promise.all([
    localStore.clear("workouts"),
    localStore.clear("exercises"),
    localStore.clear("stats"),
    localStore.clear("pendingSync"),
    localStore.clear("metadata"),
  ]);
  // Default: every GET during initial load returns empty data.
  mockedFetch.mockResolvedValue(makeRes(200, { data: [] }));
  mockedSync.queueOperation.mockResolvedValue("op-x");
});

describe("DataContext.createWorkout", () => {
  it("dedupes concurrent calls into a single POST (fixes triple-tap duplicates)", async () => {
    // Deferred POST so both calls overlap before the first resolves.
    let resolvePost: (v: unknown) => void = () => {};
    const postPromise = new Promise((resolve) => {
      resolvePost = resolve;
    });

    mockedFetch.mockImplementation((url: unknown, opts: unknown) => {
      if (isWorkoutPost(url, opts)) return postPromise;
      return Promise.resolve(makeRes(200, { data: [] }));
    });

    const { result } = await renderData();

    let p1: Promise<unknown>, p2: Promise<unknown>;
    await act(async () => {
      // Fire two creates without awaiting — simulate rapid double tap.
      p1 = result.current.createWorkout({ workoutName: "A" });
      p2 = result.current.createWorkout({ workoutName: "B" });
      // Now release the in-flight POST.
      resolvePost(makeRes(201, { data: { id: "w-real", items: [], status: "DRAFT" } }));
      await Promise.all([p1, p2]);
    });

    const postCalls = mockedFetch.mock.calls.filter(([url, opts]) =>
      isWorkoutPost(url, opts),
    );
    expect(postCalls.length).toBe(1);
  });

  it("returns the same workout object to both concurrent callers", async () => {
    mockedFetch.mockImplementation((url: unknown, opts: unknown) => {
      if (isWorkoutPost(url, opts)) {
        return Promise.resolve(
          makeRes(201, { data: { id: "w-real", items: [], status: "DRAFT" } }),
        );
      }
      return Promise.resolve(makeRes(200, { data: [] }));
    });

    const { result } = await renderData();

    let r1: any, r2: any;
    await act(async () => {
      const [a, b] = await Promise.all([
        result.current.createWorkout({ workoutName: "A" }),
        result.current.createWorkout({ workoutName: "B" }),
      ]);
      r1 = a;
      r2 = b;
    });

    expect(r1.id).toBe("w-real");
    expect(r2.id).toBe("w-real");
  });

  it("offline create produces a temp workout and queues exactly one sync op", async () => {
    mockedFetch.mockImplementation((url: unknown, opts: unknown) => {
      if (isWorkoutPost(url, opts)) {
        // Network failure → offline fallback path.
        return Promise.reject(new TypeError("Failed to fetch"));
      }
      return Promise.resolve(makeRes(200, { data: [] }));
    });

    const { result } = await renderData();

    let created: any;
    await act(async () => {
      created = await result.current.createWorkout({ workoutName: "Offline" });
    });

    expect(created.id).toMatch(/^temp_workout_/);
    expect(created.status).toBe("DRAFT");

    const createOps = mockedSync.queueOperation.mock.calls.filter(
      ([op]) => op.entity === "workout" && op.type === "create",
    );
    expect(createOps.length).toBe(1);
    expect(createOps[0][0].data).toEqual(
      expect.objectContaining({ workoutName: "Offline", clientTempId: created.id }),
    );
  });

  it("a second create after the first settles is allowed (guard resets)", async () => {
    mockedFetch.mockImplementation((url: unknown, opts: unknown) => {
      if (isWorkoutPost(url, opts)) {
        return Promise.resolve(
          makeRes(201, { data: { id: `w-${Math.random()}`, items: [], status: "DRAFT" } }),
        );
      }
      return Promise.resolve(makeRes(200, { data: [] }));
    });

    const { result } = await renderData();

    await act(async () => {
      await result.current.createWorkout({ workoutName: "first" });
    });
    await act(async () => {
      await result.current.createWorkout({ workoutName: "second" });
    });

    const postCalls = mockedFetch.mock.calls.filter(([url, opts]) =>
      isWorkoutPost(url, opts),
    );
    // Two sequential (non-overlapping) creates => two POSTs.
    expect(postCalls.length).toBe(2);
  });
});

describe("DataContext.addSet 404 handling (data-loss fix)", () => {
  const exercise = {
    id: "e1",
    name: "Squat",
    muscleGroups: [],
    description: undefined,
    photos: [],
    creator: { id: "u1", firstName: "T", lastName: "U", email: "t@e.com" },
  };
  const workout = {
    id: "w1",
    userId: "u1",
    status: "DRAFT",
    workoutDate: new Date().toISOString(),
    workoutName: "W",
    gymName: null,
    location: null,
    workoutNotes: null,
    workoutPlanId: null,
    skippedPlanExerciseIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: [
      {
        id: "i1",
        workoutId: "w1",
        exerciseId: "e1",
        orderInWorkout: 1,
        notes: null,
        previousNote: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        exercise: { id: "e1", name: "Squat", muscleGroups: [], description: null, photos: [] },
        sets: [],
      },
    ],
  };

  const installFetch = (onSetPost: () => Promise<unknown>) => {
    mockedFetch.mockImplementation((url: unknown, opts: unknown) => {
      const u = String(url);
      const method = (opts as RequestInit | undefined)?.method ?? "GET";
      if (method === "POST" && u.includes("/items/i1/sets")) return onSetPost();
      if (u.endsWith("/api/workouts/active")) {
        return Promise.resolve(makeRes(200, { data: { activeWorkoutId: "w1" } }));
      }
      if (u.endsWith("/api/workouts/w1")) {
        return Promise.resolve(makeRes(200, { data: workout }));
      }
      if (u.endsWith("/api/workouts")) {
        return Promise.resolve(makeRes(200, { data: [workout] }));
      }
      if (u.includes("/api/exercises")) {
        return Promise.resolve(makeRes(200, { data: [exercise] }));
      }
      return Promise.resolve(makeRes(200, { data: [] }));
    });
  };

  it("on set 404 reconciles the single workout (refreshWorkout) instead of purging it", async () => {
    installFetch(() => Promise.resolve(makeRes(404, {})));

    const { result } = await renderData();
    await waitFor(() => expect(result.current.workouts.length).toBe(1));

    await act(async () => {
      await result.current.addSet("w1", "i1", { weight: 50, repetitions: 8, setNumber: 1 });
    });

    // Workout must NOT be purged from local state.
    expect(result.current.workouts.find((w) => w.id === "w1")).toBeTruthy();

    // A reconcile GET for that single workout must have been issued.
    const refreshCalls = mockedFetch.mock.calls.filter(
      ([url, opts]) =>
        String(url).endsWith("/api/workouts/w1") &&
        ((opts as RequestInit | undefined)?.method ?? "GET") === "GET",
    );
    expect(refreshCalls.length).toBeGreaterThanOrEqual(1);

    // No sync op queued for a 404 set.
    const setOps = mockedSync.queueOperation.mock.calls.filter(([op]) => op.entity === "set");
    expect(setOps.length).toBe(0);
  });

  it("on set success the optimistic set is kept and no reconcile/queue happens", async () => {
    installFetch(() => Promise.resolve(makeRes(201, { data: { id: "s-real" } })));

    const { result } = await renderData();
    await waitFor(() => expect(result.current.workouts.length).toBe(1));

    await act(async () => {
      await result.current.addSet("w1", "i1", { weight: 50, repetitions: 8, setNumber: 1 });
    });

    const w = result.current.workouts.find((x) => x.id === "w1");
    expect(w?.items[0].sets.length).toBe(1);
  });

  it("addSet sends clientId matching the optimistic temp set id (backend idempotency)", async () => {
    installFetch(() => Promise.resolve(makeRes(201, { data: { id: "s-real" } })));

    const { result } = await renderData();
    await waitFor(() => expect(result.current.workouts.length).toBe(1));

    await act(async () => {
      await result.current.addSet("w1", "i1", { weight: 50, repetitions: 8, setNumber: 1 });
    });

    const setPostCall = mockedFetch.mock.calls.find(
      ([url, opts]) =>
        String(url).includes("/items/i1/sets") &&
        (opts as RequestInit | undefined)?.method === "POST",
    );
    const sentBody = JSON.parse((setPostCall?.[1] as RequestInit).body as string);
    expect(sentBody.clientId).toMatch(/^temp_set_/);
  });
});

describe("DataContext.refreshWorkout epoch guard", () => {
  const exercise = {
    id: "e1",
    name: "Squat",
    muscleGroups: [],
    description: undefined,
    photos: [],
    creator: { id: "u1", firstName: "T", lastName: "U", email: "t@e.com" },
  };
  const workout = {
    id: "w1",
    userId: "u1",
    status: "DRAFT",
    workoutDate: new Date().toISOString(),
    workoutName: "W",
    gymName: null,
    location: null,
    workoutNotes: null,
    workoutPlanId: null,
    skippedPlanExerciseIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: [
      {
        id: "i1",
        workoutId: "w1",
        exerciseId: "e1",
        orderInWorkout: 1,
        notes: null,
        previousNote: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        exercise: { id: "e1", name: "Squat", muscleGroups: [], description: null, photos: [] },
        sets: [],
      },
    ],
  };

  it("does NOT overwrite local sets when a local workout write lands while the reconcile GET is in flight", async () => {
    mockedFetch.mockImplementation(async (url: unknown, opts: unknown) => {
      const u = String(url);
      const method = (opts as RequestInit | undefined)?.method ?? "GET";
      // Seria trafia na 404 → addSet uruchamia refreshWorkout("w1").
      if (method === "POST" && u.includes("/items/i1/sets")) return makeRes(404, {});
      if (method === "GET" && u.endsWith("/api/workouts/w1")) {
        // Użytkownik zapisuje coś lokalnie w trakcie trwania GET-a
        // (rośnie workoutWriteEpoch) — odpowiedź serwera jest już nieaktualna.
        await localStore.put("workouts", { ...workout, workoutName: "LOCAL-NEWER" });
        return makeRes(200, { data: { ...workout, workoutName: "SERVER-STALE" } });
      }
      if (u.endsWith("/api/workouts/active")) {
        return makeRes(200, { data: { activeWorkoutId: "w1" } });
      }
      if (u.endsWith("/api/workouts")) return makeRes(200, { data: [workout] });
      if (u.includes("/api/exercises")) return makeRes(200, { data: [exercise] });
      return makeRes(200, { data: [] });
    });

    const { result } = await renderData();
    await waitFor(() => expect(result.current.workouts.length).toBe(1));

    await act(async () => {
      await result.current.addSet("w1", "i1", { weight: 50, repetitions: 8, setNumber: 1 });
    });

    const w = result.current.workouts.find((x) => x.id === "w1");
    // Przestarzały payload serwera nie może nadpisać stanu lokalnego...
    expect(w?.workoutName).not.toBe("SERVER-STALE");
    // ...ani skasować optymistycznie dodanej serii.
    expect(w?.items[0].sets.length).toBe(1);
  });
});

describe("DataContext.skipPlanExercise rollback", () => {
  const workout = {
    id: "w1",
    userId: "u1",
    status: "DRAFT",
    workoutDate: new Date().toISOString(),
    workoutName: "W",
    gymName: null,
    location: null,
    workoutNotes: null,
    workoutPlanId: "p1",
    skippedPlanExerciseIds: [] as string[],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: [],
  };

  it("rolls back only the failed skip, keeping a skip added meanwhile", async () => {
    let rejectFirst: (e: unknown) => void = () => {};
    const firstSkip = new Promise((_, reject) => {
      rejectFirst = reject;
    });

    mockedFetch.mockImplementation((url: unknown, opts: unknown) => {
      const u = String(url);
      const init = opts as RequestInit | undefined;
      if (u.endsWith("/skip-plan-exercise") && init?.method === "POST") {
        const body = JSON.parse(init.body as string);
        // Pierwsze pominięcie wisi i ostatecznie failuje...
        if (body.exerciseId === "e1") return firstSkip;
        // ...drugie w tym czasie kończy się sukcesem.
        return Promise.resolve(makeRes(200, { data: {} }));
      }
      if (u.endsWith("/api/workouts/active")) {
        return Promise.resolve(makeRes(200, { data: { activeWorkoutId: "w1" } }));
      }
      if (u.endsWith("/api/workouts")) {
        return Promise.resolve(makeRes(200, { data: [workout] }));
      }
      return Promise.resolve(makeRes(200, { data: [] }));
    });

    const { result } = await renderData();
    await waitFor(() => expect(result.current.workouts.length).toBe(1));

    await act(async () => {
      const p1 = result.current.skipPlanExercise("w1", "e1");
      await result.current.skipPlanExercise("w1", "e2");
      rejectFirst(new Error("server error"));
      await p1;
    });

    const skipped = result.current.workouts.find((w) => w.id === "w1")
      ?.skippedPlanExerciseIds;
    // Nieudana operacja cofa tylko siebie — nowsza zmiana użytkownika zostaje.
    expect(skipped).toEqual(["e2"]);
  });
});

describe("DataContext.addExerciseToWorkout", () => {
  const exercise = {
    id: "e1",
    name: "Squat",
    muscleGroups: [],
    description: undefined,
    photos: [],
    creator: { id: "u1", firstName: "T", lastName: "U", email: "t@e.com" },
  };
  const workout = {
    id: "w1",
    userId: "u1",
    status: "DRAFT",
    workoutDate: new Date().toISOString(),
    workoutName: "W",
    gymName: null,
    location: null,
    workoutNotes: null,
    workoutPlanId: null,
    skippedPlanExerciseIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: [],
  };

  it("sends clientId matching the optimistic temp item id (backend idempotency)", async () => {
    mockedFetch.mockImplementation((url: unknown, opts: unknown) => {
      const u = String(url);
      const method = (opts as RequestInit | undefined)?.method ?? "GET";
      if (method === "POST" && u.endsWith("/api/workouts/w1/exercises")) {
        return Promise.resolve(makeRes(201, { data: { id: "item-real", sets: [] } }));
      }
      if (u.endsWith("/api/workouts/active")) {
        return Promise.resolve(makeRes(200, { data: { activeWorkoutId: "w1" } }));
      }
      if (u.endsWith("/api/workouts/w1")) {
        return Promise.resolve(makeRes(200, { data: workout }));
      }
      if (u.endsWith("/api/workouts")) {
        return Promise.resolve(makeRes(200, { data: [workout] }));
      }
      if (u.includes("/api/exercises")) {
        return Promise.resolve(makeRes(200, { data: [exercise] }));
      }
      return Promise.resolve(makeRes(200, { data: [] }));
    });

    const { result } = await renderData();
    await waitFor(() => expect(result.current.workouts.length).toBe(1));

    await act(async () => {
      await result.current.addExerciseToWorkout("w1", "e1");
    });

    const postCall = mockedFetch.mock.calls.find(
      ([url, opts]) =>
        String(url).endsWith("/api/workouts/w1/exercises") &&
        (opts as RequestInit | undefined)?.method === "POST",
    );
    const sentBody = JSON.parse((postCall?.[1] as RequestInit).body as string);
    expect(sentBody).toEqual({ exerciseId: "e1", clientId: expect.stringMatching(/^temp_item_/) });
  });
});

