import { useState, useMemo } from "react";
import { useData } from "@/contexts/data";
import type { Exercise } from "@/types";
import type { ExerciseStats } from "@/types";
import { MUSCLE_GROUPS } from "@/constants";
import { useAuth } from "@/contexts/AuthContext";
import { fuzzyMatch } from "@/utils/fuzzyMatch";

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
      list = list.filter(
        (ex) => fuzzyMatch(ex.name, searchQuery) || ex.muscleGroups.some((mg) => fuzzyMatch(mg, searchQuery)),
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

  return (
    <div className="flex flex-col">
      {/* Search */}
      <div className="px-5 pt-4 pb-3" style={{ borderBottom: "1px solid var(--gg-border)" }}>
        <div
          className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5"
          style={{
            background: "var(--gg-surface2)",
            border: "1px solid var(--gg-border)",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--gg-text-muted)" }}>
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
              className="border-none bg-transparent cursor-pointer text-[12px]"
              style={{ color: "var(--gg-text-muted)" }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Sort + filter pills */}
      <div className="px-5 py-2.5 flex gap-2 flex-wrap" style={{ borderBottom: "1px solid var(--gg-border)" }}>
        <button
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          className="px-3 py-1 rounded-lg text-[11px] font-bold border-none cursor-pointer transition-all"
          style={{
            background: "var(--gg-surface2)",
            color: "var(--gg-text)",
            border: "1px solid var(--gg-border)",
          }}
        >
          {sortOrder === "asc" ? "A → Z" : "Z → A"}
        </button>
        <button
          onClick={() => setShowOnlyPerformed(!showOnlyPerformed)}
          className="px-3 py-1 rounded-lg text-[11px] font-bold border-none cursor-pointer transition-all"
          style={{
            background: showOnlyPerformed ? "var(--gg-surface)" : "var(--gg-surface2)",
            color: showOnlyPerformed ? "var(--gg-a2)" : "var(--gg-text-muted)",
            border: showOnlyPerformed ? "1px solid var(--gg-a1)" : "1px solid var(--gg-border)",
          }}
        >
          Wykonywane
        </button>
        <button
          onClick={() => setShowOnlyMyExercises(!showOnlyMyExercises)}
          className="px-3 py-1 rounded-lg text-[11px] font-bold border-none cursor-pointer transition-all"
          style={{
            background: showOnlyMyExercises ? "var(--gg-surface)" : "var(--gg-surface2)",
            color: showOnlyMyExercises ? "var(--gg-a2)" : "var(--gg-text-muted)",
            border: showOnlyMyExercises ? "1px solid var(--gg-a1)" : "1px solid var(--gg-border)",
          }}
        >
          Moje własne
        </button>
      </div>

      {/* Muscle group chips */}
      <div className="px-5 py-2.5 overflow-x-auto scrollbar-hide" style={{ borderBottom: "1px solid var(--gg-border)" }}>
        <div className="flex gap-1.5 min-w-min">
          {MUSCLE_GROUPS.map((group) => {
            const isActive = selectedMuscleGroup === group.value;
            return (
              <button
                key={group.value}
                onClick={() => setSelectedMuscleGroup(isActive ? undefined : group.value)}
                className="text-[11px] font-semibold whitespace-nowrap flex-shrink-0 cursor-pointer px-3 py-1 rounded-full transition-all"
                style={{
                  border: `1px solid ${isActive ? "var(--gg-a1)" : "var(--gg-border)"}`,
                  background: isActive ? "var(--gg-surface2)" : "transparent",
                  color: isActive ? "var(--gg-a2)" : "var(--gg-text-sub)",
                }}
              >
                {group.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="px-5 py-4 pb-28 flex flex-col gap-2.5 max-w-2xl mx-auto w-full">
        {loading ? (
          <div className="flex flex-col items-center gap-2 py-12">
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "var(--gg-a1)", borderTopColor: "transparent" }}
            />
            <p className="text-[13px] font-medium" style={{ color: "var(--gg-text-muted)" }}>Ładowanie ćwiczeń...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-[13px]" style={{ color: "var(--gg-text-muted)" }}>
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
  const creatorId = exercise.creator?.id ?? exercise.creatorUserId;
  const canEdit = !!user && (user.isAdmin || (creatorId != null && creatorId === user.id));
  const isPerformed = performedHighlight && !!stats;

  return (
    <div
      onClick={mode === "select" ? () => onSelect?.(exercise.id) : undefined}
      className="rounded-2xl transition-all duration-150 p-4"
      style={{
        background: "var(--gg-surface)",
        border: isPerformed ? "1px solid var(--gg-a1)" : "1px solid var(--gg-border)",
        boxShadow: "var(--gg-shadow)",
        cursor: mode === "select" ? "pointer" : "default",
      }}
    >
      <div className="flex justify-between items-start mb-2">
        <h3
          className="font-barlow font-bold text-[15px] flex-1 leading-snug"
          style={{ color: "var(--gg-text)" }}
        >
          {creatorId != null && creatorId !== "1" && (
            <svg
              width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="var(--gg-a2)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
              style={{ display: "inline", marginRight: 6, marginBottom: 2, verticalAlign: "middle" }}
            >
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          )}
          {exercise.name}
        </h3>
        <div className="flex gap-1.5 shrink-0 ml-2">
          {mode === "select" ? (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
              style={{ background: "var(--gg-btn-bg)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </div>
          ) : canEdit && (
            <>
              <button
                onClick={() => onEdit?.(exercise)}
                className="w-8 h-8 rounded-lg border-none cursor-pointer flex items-center justify-center transition-colors"
                style={{ background: "var(--gg-surface2)", color: "var(--gg-text-sub)" }}
                title="Edytuj"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z"/>
                </svg>
              </button>
              <button
                onClick={() => onDelete?.(exercise.id, exercise.name)}
                className="w-8 h-8 rounded-lg border-none cursor-pointer flex items-center justify-center transition-colors"
                style={{ background: "var(--gg-surface2)", color: "var(--gg-text-muted)" }}
                title="Usuń"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Muscle tags */}
      <div className="flex gap-1.5 flex-wrap mb-2">
        {exercise.muscleGroups.map((mg) => {
          const group = MUSCLE_GROUPS.find((g) => g.value === mg);
          return (
            <span
              key={mg}
              className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md"
              style={{ color: "var(--gg-tag-text)", background: "var(--gg-tag-bg)" }}
            >
              {group?.label || mg}
            </span>
          );
        })}
      </div>

      {exercise.description && (
        <p className="text-[12px] mb-2 line-clamp-2 leading-relaxed" style={{ color: "var(--gg-text-muted)" }}>
          {exercise.description}
        </p>
      )}

      {stats && (
        <div
          className="flex items-center gap-3 rounded-xl px-3 py-2 mt-2 num-tabular text-[12px]"
          style={{ background: "var(--gg-surface2)", border: "1px solid var(--gg-border)" }}
        >
          <span style={{ color: "var(--gg-text-muted)" }}>
            Ostatnio: <strong style={{ color: "var(--gg-text)" }}>{stats.lastWeight} kg × {stats.lastReps}</strong>
          </span>
          <div className="w-[1px] h-3" style={{ background: "var(--gg-border)" }} />
          <span style={{ color: "var(--gg-text-muted)" }}>
            Rekord: <strong style={{ color: "var(--gg-a2)" }}>{stats.maxWeight} kg × {stats.maxWeightReps}</strong>
          </span>
        </div>
      )}
    </div>
  );
}
