import { and, asc, count, eq } from "drizzle-orm";
import { outbox, syncIssues } from "../db/schema";
import type { Ctx, Db } from "../db/types";
import { applyPull, currentToPull, deleteLocal } from "./apply";
import { enqueue, type OutboxEntity } from "./outbox";

export type SyncIssue = typeof syncIssues.$inferSelect;

export function listOpenIssues(db: Db): SyncIssue[] {
  return db.select().from(syncIssues).where(eq(syncIssues.status, "open")).orderBy(asc(syncIssues.id)).all();
}

export function openIssueCount(db: Db): number {
  return db.select({ n: count() }).from(syncIssues).where(eq(syncIssues.status, "open")).get()?.n ?? 0;
}

function requireOpen(tx: Db, issueId: number): SyncIssue {
  const issue = tx.select().from(syncIssues).where(and(eq(syncIssues.id, issueId), eq(syncIssues.status, "open"))).get();
  if (!issue) throw new Error(`No open sync issue ${issueId}`);
  return issue;
}

function close(tx: Db, issue: SyncIssue): void {
  tx.delete(outbox).where(eq(outbox.opId, issue.opId)).run();
  tx.update(syncIssues).set({ status: "resolved" }).where(eq(syncIssues.id, issue.id)).run();
}

/**
 * "Discard local change": drops the rejected op and goes back to the server's version: `current` is restored,
 * and when the server has no such record the local one is deleted (with its cascade and its other unsent ops).
 */
export function discardIssue(db: Db, issueId: number): void {
  db.transaction((tx) => {
    const issue = requireOpen(tx, issueId);
    close(tx, issue);
    const entity = issue.entity as OutboxEntity;
    if (issue.current) {
      applyPull(tx, { cursor: null, hasMore: false, resyncRequired: false, deletes: [], serverTime: "", upserts: currentToPull(entity, JSON.parse(issue.current) as object) });
    } else {
      deleteLocal(tx, entity, issue.entityId);
      tx.delete(outbox).where(and(eq(outbox.entity, entity), eq(outbox.entityId, issue.entityId), eq(outbox.state, "pending"))).run();
    }
  });
}

/**
 * "Retry after edit": queues the rejected operation again under a new opId with `patch` merged into its fields
 * (the user fixed the plan name, ...). The local record is expected to hold the corrected data already.
 */
export function retryIssue(ctx: Ctx, issueId: number, patch: Record<string, unknown> = {}): void {
  ctx.db.transaction((tx) => {
    const issue = requireOpen(tx, issueId);
    const { opId: _o, type: _t, at: _a, ...fields } = JSON.parse(issue.payload) as Record<string, unknown>;
    close(tx, issue);
    enqueue(tx, { opId: ctx.newId(), type: issue.type, at: ctx.now(), entity: issue.entity as OutboxEntity, entityId: issue.entityId, fields: { ...fields, ...patch } });
  });
}

export interface IssueGroup {
  /** `parentDeleted`: the record was deleted elsewhere (not_found, nothing on the server); several ops collapse into one notice. */
  kind: "parentDeleted" | "single";
  /** workout (also items and sets), exercise or plan. */
  subject: "workout" | "exercise" | "plan";
  issues: SyncIssue[];
  message: string;
}

const SUBJECT: Record<string, IssueGroup["subject"]> = { workout: "workout", item: "workout", set: "workout", exercise: "exercise", plan: "plan" };
const DELETED_TEXT: Record<IssueGroup["subject"], string> = {
  workout: "Trening został usunięty na innym urządzeniu",
  exercise: "Ćwiczenie zostało usunięte na innym urządzeniu",
  plan: "Plan został usunięty na innym urządzeniu",
};

/** PLAN 5.5: rejected ops of a record deleted elsewhere become one message, e.g. "...; 3 niewysłane zmiany pominięto". */
export function groupIssues(issues: SyncIssue[]): IssueGroup[] {
  const groups: IssueGroup[] = [];
  const deleted = new Map<IssueGroup["subject"], SyncIssue[]>();
  for (const issue of issues) {
    const subject = SUBJECT[issue.entity] ?? "workout";
    if (issue.code === "not_found" && issue.current === null) deleted.set(subject, [...(deleted.get(subject) ?? []), issue]);
    else groups.push({ kind: "single", subject, issues: [issue], message: issue.error });
  }
  for (const [subject, list] of deleted) {
    const n = list.length;
    const word = n === 1 ? "niewysłana zmiana" : n < 5 ? "niewysłane zmiany" : "niewysłanych zmian";
    groups.push({ kind: "parentDeleted", subject, issues: list, message: `${DELETED_TEXT[subject]}; ${n} ${word} pominięto` });
  }
  return groups;
}

const ACTION = (type: string): string => {
  const verb = type.split(".")[1] ?? "";
  if (verb === "update") return "Aktualizacja";
  if (verb === "delete") return "Usunięcie";
  return "Zapisanie";
};
const OBJECT: Record<string, string> = { workout: "treningu", item: "ćwiczenia w treningu", set: "serii", exercise: "ćwiczenia", plan: "planu" };

/** "{akcja} {obiekt}" line of the rejected-changes banner (PWA SyncFailureBanner wording), e.g. "Aktualizacja planu". */
export const describeIssue = (issue: Pick<SyncIssue, "type" | "entity">): string => `${ACTION(issue.type)} ${OBJECT[issue.entity] ?? "treningu"}`;
