import { useState, useMemo } from "react";
import { useData } from "@/contexts/DataContext";
import type { Exercise } from "@/hooks/useExercises";
import type { ExerciseStats } from "@/types";
import { MUSCLE_GROUPS } from "../../constants";
import { useAuth } from "@/contexts/AuthContext";

interface ExerciseListProps {
  mode: "select" | "manage";
  onSelectExercise?: (exerciseId: string) => void;
  onEditExercise?: (exercise: Exercise) => void;
  onDeleteExercise?: (id: string, name: string) => void;
  excludeExerciseIds?: string[];
}

export function ExerciseList({
  mode,
  onSelectExercise,
  onEditExercise,
  onDeleteExercise,
  excludeExerciseIds = [],
}: ExerciseListProps) {
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showOnlyPerformed, setShowOnlyPerformed] = useState(false);
  const [showOnlyMyExercises, setShowOnlyMyExercises] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { exercises: allExercises, stats: allStats, isLoading: loading } = useData();
  const { user } = useAuth();

  const exercises = useMemo(() => {
    if (!selectedMuscleGroup) return allExercises;
    return allExercises.filter((ex) => ex.muscleGroups.includes(selectedMuscleGroup));
  }, [allExercises, selectedMuscleGroup]);

  const filtered = useMemo(() => {
    let list = [...exercises];

    if (user) {
      list = list.filter((ex) => {
        const creatorId = ex.creator?.id;
        return creatorId == null || creatorId === "1" || String(creatorId) === String(user.id);
      });
    }

    if (mode === "select" && excludeExerciseIds.length > 0) {
      list = list.filter((ex) => !excludeExerciseIds.includes(ex.id));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (ex) => ex.name.toLowerCase().includes(q) || ex.muscleGroups.some((mg) => mg.toLowerCase().includes(q)),
      );
    }

    if (showOnlyMyExercises && user) {
      list = list.filter((ex) => String(ex.creator?.id) === String(user.id));
    }

    if (showOnlyPerformed) {
      const performedIds = new Set(allStats.map((s) => s.exerciseId));
      list = list.filter((ex) => performedIds.has(ex.id));
    }

    list.sort((a, b) => sortOrder === "asc" ? a.name.localeCompare(b.name, "pl") : b.name.localeCompare(a.name, "pl"));
    return list;
  }, [exercises, excludeExerciseIds, searchQuery, showOnlyMyExercises, user, showOnlyPerformed, allStats, sortOrder, mode]);

  const filterBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: "5px 13px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    background: active ? "var(--gg-grad-btn)" : "var(--gg-surface2)",
    color: active ? "#fff" : "var(--gg-text-muted)",
    border: "none",
    cursor: "pointer",
    boxShadow: active ? "0 2px 10px var(--gg-glow-sm)" : "none",
    transition: "all 0.2s",
  });

  return (
    <div className="flex flex-col">
      {/* Search */}
      <div className="px-5 pt-4 pb-3" style={{ borderBottom: "1px solid var(--gg-border)" }}>
        <div
          className="flex items-center gap-2.5 rounded-[14px]"
          style={{
            padding: "11px 14px",
            background: "var(--gg-surface)",
            border: "1.5px solid var(--gg-border)",
            boxShadow: "var(--gg-shadow)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gg-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>
          </svg>
          <input
            type="text"
            placeholder="Szukaj ćwiczenia..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 border-none outline-none bg-transparent text-[14px]"
            style={{ color: "var(--gg-text)", fontFamily: "'DM Sans', sans-serif" }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="border-none bg-transparent cursor-pointer"
              style={{ color: "var(--gg-text-muted)" }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Sort + filter pills */}
      <div className="px-5 py-3 flex gap-1.5 flex-wrap" style={{ borderBottom: "1px solid var(--gg-border)" }}>
        <button
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          style={filterBtnStyle(true)}
        >
          {sortOrder === "asc" ? "A→Z" : "Z→A"}
        </button>
        <button
          onClick={() => setShowOnlyPerformed(!showOnlyPerformed)}
          style={filterBtnStyle(showOnlyPerformed)}
        >
          Wykonywane
        </button>
        <button
          onClick={() => setShowOnlyMyExercises(!showOnlyMyExercises)}
          style={filterBtnStyle(showOnlyMyExercises)}
        >
          Moje
        </button>
      </div>

      {/* Muscle group chips */}
      <div className="px-5 py-3 overflow-x-auto scrollbar-hide" style={{ borderBottom: "1px solid var(--gg-border)" }}>
        <div className="flex gap-1.5 min-w-min pb-0.5">
          {MUSCLE_GROUPS.map((group) => {
            const isActive = selectedMuscleGroup === group.value;
            return (
              <button
                key={group.value}
                onClick={() => setSelectedMuscleGroup(isActive ? undefined : group.value)}
                className="text-[12px] font-semibold whitespace-nowrap flex-shrink-0 cursor-pointer"
                style={{
                  padding: "5px 14px",
                  borderRadius: 20,
                  border: `1.5px solid ${isActive ? "var(--gg-text)" : "var(--gg-border)"}`,
                  background: isActive ? "var(--gg-text)" : "transparent",
                  color: isActive ? "var(--gg-bg)" : "var(--gg-text-sub)",
                  transition: "all 0.2s",
                }}
              >
                {group.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="px-5 py-4 pb-6 flex flex-col gap-2.5">
        {loading ? (
          <div className="flex flex-col items-center gap-2 py-10">
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "var(--gg-a1)", borderTopColor: "transparent" }}
            />
            <p className="text-[13px]" style={{ color: "var(--gg-text-muted)" }}>Ładowanie...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-[13px]" style={{ color: "var(--gg-text-muted)" }}>
            {mode === "select" && excludeExerciseIds.length > 0
              ? "Wszystkie ćwiczenia zostały już dodane"
              : "Nie znaleziono ćwiczeń"}
          </div>
        ) : (
          filtered.map((exercise) => (
            <ExerciseItem
              key={exercise.id}
              exercise={exercise}
              mode={mode}
              stats={allStats.find((s) => s.exerciseId === exercise.id)}
              onSelect={onSelectExercise}
              onEdit={onEditExercise}
              onDelete={onDeleteExercise}
              performedHighlight={showOnlyPerformed}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface ExerciseItemProps {
  exercise: Exercise;
  mode: "select" | "manage";
  stats?: ExerciseStats;
  onSelect?: (exerciseId: string) => void;
  onEdit?: (exercise: Exercise) => void;
  onDelete?: (id: string, name: string) => void;
  performedHighlight?: boolean;
}

function ExerciseItem({ exercise, mode, stats, onSelect, onEdit, onDelete, performedHighlight }: ExerciseItemProps) {
  const { user } = useAuth();
  const creatorId = exercise.creator?.id;
  const canEdit = user && creatorId != null && String(creatorId) === String(user.id);
  const isPerformed = performedHighlight && !!stats;

  return (
    <div
      onClick={mode === "select" ? () => onSelect?.(exercise.id) : undefined}
      className="rounded-[20px] transition-all duration-150"
      style={{
        padding: "14px 16px",
        background: "var(--gg-surface)",
        border: isPerformed ? "1.5px solid var(--gg-a1)" : "1.5px solid var(--gg-border)",
        boxShadow: isPerformed ? "var(--gg-shadow-glow)" : "var(--gg-shadow)",
        cursor: mode === "select" ? "pointer" : "default",
      }}
    >
      <div className="flex justify-between items-start mb-2">
        <h3
          className="font-barlow font-bold text-[14px] flex-1 leading-snug"
          style={{ color: "var(--gg-text)" }}
        >
          {creatorId != null && creatorId !== "1" && (
            <svg
              width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="var(--gg-a1)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
              style={{ display: "inline", marginRight: 5, marginBottom: 1, verticalAlign: "middle", flexShrink: 0 }}
            >
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          )}
          {exercise.name}
        </h3>
        <div className="flex gap-1.5 flex-shrink-0 ml-2">
          {mode === "select" ? (
            <div
              className="flex items-center justify-center w-[30px] h-[30px] rounded-[9px]"
              style={{ background: "var(--gg-record-bg)", border: "1px solid var(--gg-border-med)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gg-a1)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="4" x2="12" y2="20"/>
                <line x1="4" y1="12" x2="20" y2="12"/>
              </svg>
            </div>
          ) : canEdit && (
            <>
              <button
                onClick={() => onEdit?.(exercise)}
                className="flex items-center justify-center w-[30px] h-[30px] rounded-[8px] border-none cursor-pointer"
                style={{ background: "var(--gg-surface2)" }}
                title="Edytuj"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gg-text-muted)" strokeWidth="1.5">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button
                onClick={() => onDelete?.(exercise.id, exercise.name)}
                className="flex items-center justify-center w-[30px] h-[30px] rounded-[8px] border-none cursor-pointer"
                style={{ background: "var(--gg-surface2)" }}
                title="Usuń"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gg-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tags */}
      <div className="flex gap-1.5 flex-wrap mb-1.5">
        {exercise.muscleGroups.map((mg) => {
          const group = MUSCLE_GROUPS.find((g) => g.value === mg);
          return (
            <span
              key={mg}
              className="text-[10px] font-bold tracking-[0.06em]"
              style={{ color: "var(--gg-tag-text)", background: "var(--gg-tag-bg)", padding: "3px 10px", borderRadius: 20 }}
            >
              {group?.label || mg}
            </span>
          );
        })}
      </div>

      {exercise.description && (
        <p className="text-[12px] mb-1.5 line-clamp-2" style={{ color: "var(--gg-text-muted)" }}>
          {exercise.description}
        </p>
      )}

      {stats && (
        <div
          className="flex gap-3 rounded-[12px] mt-2"
          style={{ padding: "9px 12px", background: "var(--gg-record-bg)" }}
        >
          <span className="text-[11px]" style={{ color: "var(--gg-text-sub)" }}>
            Ostatnio: <strong style={{ color: "var(--gg-text)" }}>{stats.lastWeight} kg × {stats.lastReps}</strong>
          </span>
          <div style={{ width: 1, background: "var(--gg-border)" }} />
          <span className="text-[11px]" style={{ color: "var(--gg-text-sub)" }}>
            Rekord: <strong className="grad-text">{stats.maxWeight} kg × {stats.maxWeightReps}</strong>
          </span>
        </div>
      )}
    </div>
  );
}
