import type { PullData, PushResult, Transport } from "../api/contract";

export const emptyPull = (over: Partial<PullData> = {}): PullData => ({
  cursor: "c1",
  hasMore: false,
  resyncRequired: false,
  snapshotToken: null,
  upserts: { workouts: [], workoutItems: [], workoutSets: [], exercises: [], plans: [], pendingNotes: [], profile: null },
  deletes: [],
  serverTime: "2026-01-01T10:00:00.000Z",
  ...over,
});

export interface Call {
  method: "get" | "post";
  path: string;
  body?: unknown;
}

/** Scripted transport: `respond` returns the `data` payload (wrapped in the backend envelope) or throws. */
export function fakeApi(respond: (call: Call) => unknown): Transport & { calls: Call[] } {
  const calls: Call[] = [];
  const run = async (call: Call) => {
    calls.push(call);
    return { success: true, data: await respond(call) };
  };
  return {
    calls,
    get: (path) => run({ method: "get", path }) as never,
    post: (path, body) => run({ method: "post", path, body }) as never,
  };
}

export const pushData = (results: PushResult[]) => ({ serverTime: "2026-01-01T10:00:05.000Z", results });
export const ok = (opId: string): PushResult => ({ opId, status: "applied" });
