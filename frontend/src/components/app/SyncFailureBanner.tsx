import type { SyncOperation } from "@/utils/localStore";

const ENTITY_LABELS: Record<SyncOperation["entity"], string> = {
  workout: "treningu",
  workoutItem: "ćwiczenia w treningu",
  set: "serii",
  exercise: "ćwiczenia",
  plan: "planu",
};

const ACTION_LABELS: Record<SyncOperation["type"], string> = {
  create: "Zapisanie",
  update: "Aktualizacja",
  delete: "Usunięcie",
};

function describeOperation(op: SyncOperation): string {
  return `${ACTION_LABELS[op.type]} ${ENTITY_LABELS[op.entity]}`;
}

interface SyncFailureBannerProps {
  operations: SyncOperation[];
  onRetry: () => void;
  onDismiss: () => void;
}

export function SyncFailureBanner({ operations, onRetry, onDismiss }: SyncFailureBannerProps) {
  const unique = [...new Set(operations.map(describeOperation))];

  return (
    <div
      className="px-4 py-2.5"
      style={{
        background: "var(--gg-active-bg)",
        borderBottom: "1px solid var(--gg-active-border)",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold" style={{ color: "var(--gg-active-border)" }}>
            Nie udało się zsynchronizować zmian:
          </p>
          <ul className="mt-0.5">
            {unique.map((desc) => (
              <li key={desc} className="text-[11px]" style={{ color: "var(--gg-text-sub)" }}>
                · {desc}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex shrink-0 gap-3 mt-0.5">
          <button
            onClick={onRetry}
            className="text-[11px] font-bold border-none bg-transparent cursor-pointer"
            style={{ color: "var(--gg-active-border)" }}
          >
            Ponów
          </button>
          <button
            onClick={onDismiss}
            className="text-[11px] font-medium border-none bg-transparent cursor-pointer"
            style={{ color: "var(--gg-text-muted)" }}
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
}
