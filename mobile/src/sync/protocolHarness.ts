/**
 * Test harness for src/sync/sync.protocol.ts: real client stack (session, SQLite file per device, outbox, engine)
 * against a running LOCAL backend, plus a "PWA" actor that uses the old endpoints.
 * Env: PROTOCOL_API (default http://localhost:3100). Start the backend with NODE_ENV=test (no auth rate limit).
 */
import { randomUUID } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Transport } from "../api/contract";
import { NetworkError } from "../api/errors";
import { exercises, planItems, plans, workoutItems, workoutSets, workouts } from "../db/schema";
import { openNodeDb } from "../db/testing";
import type { Ctx, Db } from "../db/types";
import { createSession, type KeyValueStore, type Session } from "../session/session";
import { makeClock } from "./clock";
import { createSyncEngine, type SyncEngine } from "./engine";

export const API = process.env.PROTOCOL_API ?? "http://localhost:3100";

export interface Creds {
  email: string;
  password: string;
}

export const newCreds = (): Creds => ({ email: `proto-${randomUUID()}@test.local`, password: "Passw0rd!" });

export const memoryStore = (): KeyValueStore & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, get: async (k) => data.get(k) ?? null, set: async (k, v) => void data.set(k, v), remove: async (k) => void data.delete(k) };
};

async function call<T>(method: string, path: string, token: string | null, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "content-type": "application/json", ...(token && { authorization: `Bearer ${token}` }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res.json()) as { success: boolean; data: T; error?: string };
  if (!res.ok) throw Object.assign(new Error(`${method} ${path}: HTTP ${res.status} ${json.error ?? ""}`), { status: res.status });
  return json.data;
}

/** The PWA: old endpoints with the PWA login token. */
export interface PwaClient {
  userId: string;
  get<T>(path: string): Promise<T>;
  req<T>(method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE", path: string, body?: unknown): Promise<T>;
}

export async function pwaLogin(creds: Creds): Promise<PwaClient> {
  const data = await call<{ token: string; user: { id: string } }>("POST", "/api/auth/login", null, creds);
  const req = <T>(method: string, path: string, body?: unknown) => call<T>(method, path, data.token, body);
  return { userId: data.user.id, req, get: (path) => req("GET", path) };
}

export interface Net {
  offline: boolean;
  /** Next push is executed by the server, but its response is lost. */
  dropNextPushResponse: boolean;
  pushRequests: number;
}

export interface Device {
  creds: Creds;
  store: ReturnType<typeof memoryStore>;
  file: string;
  session: Session;
  db: Db;
  ctx: Ctx;
  engine: SyncEngine;
  net: Net;
  /** Device clock = real time + shift (ms): set a negative shift to work "in the past". */
  clock: { shift: number };
  sync(): Promise<void>;
  /** Kills the app: stops timers, reopens the same database file and the same stored session. */
  restart(): Promise<Device>;
}

const live: Device[] = [];
const dir = mkdtempSync(join(tmpdir(), "gymgate-protocol-"));
export const stopAll = () => live.splice(0).forEach((d) => d.engine.stop());

interface OpenOptions {
  creds: Creds;
  mode: "register" | "login" | "restore";
  file?: string;
  store?: ReturnType<typeof memoryStore>;
  clockShift?: number;
}

export async function openDevice(o: OpenOptions): Promise<Device> {
  const store = o.store ?? memoryStore();
  const file = o.file ?? join(dir, `${randomUUID()}.db`);
  const session = createSession({
    baseUrl: API,
    store,
    openDb: () => openNodeDb(file),
    deleteDb: () => undefined,
    newId: randomUUID,
  });
  if (o.mode === "register") await session.register({ ...o.creds, firstName: "Proto", lastName: "Col" });
  else if (o.mode === "login") await session.login(o.creds.email, o.creds.password);
  else await session.restore();
  const db = session.getDb() as Db;
  const clock = { shift: o.clockShift ?? 0 };
  const nowMs = () => Date.now() + clock.shift;
  const ctx: Ctx = { db, userId: session.getState().user?.id ?? "", newId: randomUUID, now: makeClock(db, nowMs) };
  const net: Net = { offline: false, dropNextPushResponse: false, pushRequests: 0 };
  const offline = () => {
    if (net.offline) throw new NetworkError("airplane mode");
  };
  const api: Transport = {
    get: async (path) => {
      offline();
      return session.api.get(path);
    },
    post: async (path, body) => {
      offline();
      const res = await session.api.post(path, body);
      if (path.includes("/push")) {
        net.pushRequests++;
        if (net.dropNextPushResponse) {
          net.dropNextPushResponse = false;
          throw new NetworkError("response lost");
        }
      }
      return res as never;
    },
  };
  const engine = createSyncEngine({ db, api, deviceId: await session.deviceId(), now: ctx.now, isPaused: () => session.getState().status !== "active" });
  const device: Device = {
    creds: o.creds,
    store,
    file,
    session,
    db,
    ctx,
    engine,
    net,
    clock,
    sync: () => engine.syncNow(),
    restart: async () => {
      engine.stop();
      return openDevice({ creds: o.creds, mode: "restore", file, store, clockShift: clock.shift });
    },
  };
  live.push(device);
  return device;
}

/** Registers a fresh user through the mobile endpoint and returns the first device. */
export const registerDevice = async (): Promise<Device> => openDevice({ creds: newCreds(), mode: "register" });

/** Everything a user can see in a device DB, sorted, for comparing two devices or a device with the server. */
export function localData(db: Db) {
  const by = <T extends { id: string }>(rows: T[]) => rows.sort((a, b) => a.id.localeCompare(b.id));
  return {
    workouts: by(db.select().from(workouts).all()),
    items: by(db.select().from(workoutItems).all()),
    sets: by(db.select().from(workoutSets).all()),
    exercises: by(db.select().from(exercises).all()),
    plans: by(db.select().from(plans).all()),
    planItems: by(db.select().from(planItems).all()),
  };
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
