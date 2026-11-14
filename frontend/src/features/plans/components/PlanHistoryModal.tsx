import { useEffect, useState } from "react";
import { useData } from "@/contexts/data";
import { Modal } from "@/components/ui";
import type { WorkoutPlanVersion } from "@/types";
import { diffVersions, type PlanChange } from "../planHistory";

interface PlanHistoryModalProps {
  planId: string;
  onClose: () => void;
}

const CHANGE_STYLE: Record<PlanChange["type"], { sign: string; color: string }> = {
  added: { sign: "+", color: "#22c55e" },
  removed: { sign: "−", color: "var(--gg-error)" },
  moved: { sign: "↕", color: "var(--gg-a1)" },
  name: { sign: "✎", color: "var(--gg-text-sub)" },
  shortName: { sign: "✎", color: "var(--gg-text-sub)" },
  public: { sign: "◉", color: "var(--gg-text-sub)" },
};

function describeChange(c: PlanChange): string {
  switch (c.type) {
    case "added":
      return c.name;
    case "removed":
      return c.name;
    case "moved":
      return `${c.name}: pozycja ${c.from} → ${c.to}`;
    case "name":
      return `Nazwa: „${c.from}” → „${c.to}”`;
    case "shortName":
      return `Nazwa skrócona: ${c.from ? `„${c.from}”` : "brak"} → ${c.to ? `„${c.to}”` : "brak"}`;
    case "public":
      return c.to ? "Plan stał się publiczny" : "Plan stał się prywatny";
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("pl-PL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PlanHistoryModal({ planId, onClose }: PlanHistoryModalProps) {
  const { getPlanHistory } = useData();
  const [versions, setVersions] = useState<WorkoutPlanVersion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPlanHistory(planId)
      .then((v) => !cancelled && setVersions(v))
      .catch((err: unknown) => !cancelled && setError(err instanceof Error ? err.message : "Błąd"));
    return () => {
      cancelled = true;
    };
  }, [planId, getPlanHistory]);

  return (
    <Modal isOpen onClose={onClose} title="Historia planu" subtitle="Najnowsze zmiany na górze">
      <div className="max-h-[65vh] overflow-y-auto -mx-1 px-1">
        {error && (
          <p className="text-[13px] m-0" style={{ color: "var(--gg-error)" }}>{error}</p>
        )}
        {!error && !versions && (
          <p className="text-[13px] m-0" style={{ color: "var(--gg-text-muted)" }}>Ładowanie…</p>
        )}

        {versions?.map((ver, i) => {
          const older = versions[i + 1];
          const changes = older ? diffVersions(older, ver) : null;
          const isOpen = expanded === ver.version;

          return (
            <div
              key={ver.version}
              className="mb-2.5 rounded-[14px] p-3.5"
              style={{ background: "var(--gg-surface2)", border: "1px solid var(--gg-border)" }}
            >
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : ver.version)}
                className="w-full flex items-center justify-between gap-2 border-none bg-transparent p-0 cursor-pointer text-left"
                aria-expanded={isOpen}
              >
                <span className="font-barlow font-bold text-[15px]" style={{ color: "var(--gg-text)" }}>
                  Wersja {ver.version}
                  {i === 0 && (
                    <span className="ml-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--gg-a1)" }}>
                      Aktualna
                    </span>
                  )}
                </span>
                <span className="text-[11px] font-mono shrink-0" style={{ color: "var(--gg-text-muted)" }}>
                  {formatDate(ver.createdAt)} {isOpen ? "▴" : "▾"}
                </span>
              </button>

              <ul className="list-none m-0 mt-2 p-0 flex flex-col gap-1">
                {changes === null ? (
                  <li className="text-[13px]" style={{ color: "var(--gg-text-muted)" }}>
                    Wersja początkowa · {ver.exercises.length} ćw.
                  </li>
                ) : changes.length === 0 ? (
                  <li className="text-[13px]" style={{ color: "var(--gg-text-muted)" }}>Bez zmian w składzie</li>
                ) : (
                  changes.map((c, idx) => (
                    <li key={idx} className="text-[13px] flex gap-2" style={{ color: "var(--gg-text)" }}>
                      <span className="font-bold w-3 shrink-0 text-center" style={{ color: CHANGE_STYLE[c.type].color }}>
                        {CHANGE_STYLE[c.type].sign}
                      </span>
                      <span className="min-w-0 break-words">{describeChange(c)}</span>
                    </li>
                  ))
                )}
              </ul>

              {isOpen && (
                <ol
                  className="m-0 mt-3 pt-3 pl-5 text-[13px] flex flex-col gap-0.5"
                  style={{ borderTop: "1px solid var(--gg-border)", color: "var(--gg-text-sub)" }}
                >
                  {ver.exercises.map((e) => (
                    <li key={e.exerciseId}>{e.name}</li>
                  ))}
                </ol>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
