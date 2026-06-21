import { memo, useState } from "react";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import type { WorkoutPlan } from "@/types";
import { MUSCLE_GROUPS } from "@/constants/muscleGroups";
import { fuzzyMatch } from "@/utils/fuzzyMatch";

type PlanTab = "favorites" | "mine" | "builtin" | "community";
type SortOption = "az" | "za" | "newest" | "oldest";

interface PlansScreenProps {
  onCreatePlan: () => void;
  onEditPlan: (plan: WorkoutPlan) => void;
}

function muscleLabel(value: string): string {
  return MUSCLE_GROUPS.find((g) => g.value === value)?.label ?? value;
}

function getPlanMuscles(plan: WorkoutPlan): string[] {
  const all = plan.items.flatMap((i) => i.exercise.muscleGroups);
  return [...new Set(all)].slice(0, 3);
}

interface PlanCardProps {
  plan: WorkoutPlan;
  isOwner: boolean;
  onEdit?: () => void;
  onDuplicate: () => void;
  onFavoriteToggle: () => void;
}

const PlanCard = memo(function PlanCard({ plan, isOwner, onEdit, onDuplicate, onFavoriteToggle }: PlanCardProps) {
  const muscles = getPlanMuscles(plan);
  const [duplicating, setDuplicating] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { deletePlan } = useData();

  const handleDelete = async () => {
    if (!window.confirm(`Usunąć plan "${plan.name}"?`)) return;
    try {
      await deletePlan(plan.id);
    } catch {
      alert("Nie udało się usunąć planu");
    }
  };

  const handleDuplicate = async () => {
    setDuplicating(true);
    try {
      await onDuplicate();
    } finally {
      setDuplicating(false);
    }
  };

  return (
    <div
      style={{
        background: "var(--gg-surface)",
        border: "1.5px solid var(--gg-border-med)",
        borderRadius: 18,
        padding: "18px 18px 14px",
        marginBottom: 12,
      }}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left border-none bg-transparent cursor-pointer p-0"
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3
              className="font-barlow font-bold leading-tight truncate"
              style={{ fontSize: 17, color: "var(--gg-text)" }}
            >
              {plan.name}
            </h3>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--gg-text-muted)" }}>
              {plan.items.length} {plan.items.length === 1 ? "ćwiczenie" : plan.items.length < 5 ? "ćwiczenia" : "ćwiczeń"}
              {plan.isPublic && (
                <span className="ml-2" style={{ color: "var(--gg-a1)" }}>• Publiczny</span>
              )}
            </p>
          </div>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              color: "var(--gg-text-muted)",
              flexShrink: 0,
              marginTop: 3,
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {muscles.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1">
            {muscles.map((m) => (
              <span
                key={m}
                className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                style={{
                  background: "var(--gg-surface2)",
                  color: "var(--gg-text-sub)",
                  border: "1px solid var(--gg-border)",
                }}
              >
                {muscleLabel(m)}
              </span>
            ))}
          </div>
        )}
      </button>

      {expanded && plan.items.length > 0 && (
        <div
          className="mt-2 mb-3"
          style={{
            borderTop: "1px solid var(--gg-border)",
            paddingTop: 10,
          }}
        >
          {plan.items.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center gap-2 py-1"
            >
              <span
                className="text-[11px] font-bold w-5 text-right flex-shrink-0"
                style={{ color: "var(--gg-text-muted)" }}
              >
                {index + 1}.
              </span>
              <span className="text-[13px]" style={{ color: "var(--gg-text-sub)" }}>
                {item.exercise.name}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-2">
        {isOwner && onEdit && (
          <button
            onClick={onEdit}
            className="flex-1 text-[13px] font-bold rounded-[11px] border-none cursor-pointer"
            style={{
              padding: "9px 0",
              background: "var(--gg-surface2)",
              color: "var(--gg-text-sub)",
              border: "1px solid var(--gg-border)",
            }}
          >
            Edytuj
          </button>
        )}

        {!isOwner && (
          <button
            onClick={handleDuplicate}
            disabled={duplicating}
            className="flex-1 text-[13px] font-bold rounded-[11px] border-none cursor-pointer"
            style={{
              padding: "9px 0",
              background: "var(--gg-surface2)",
              color: "var(--gg-text-sub)",
              border: "1px solid var(--gg-border)",
              opacity: duplicating ? 0.6 : 1,
            }}
          >
            {duplicating ? "Kopiowanie…" : "Duplikuj do moich"}
          </button>
        )}

        <button
          onClick={onFavoriteToggle}
          className="flex items-center justify-center rounded-[11px] border-none cursor-pointer"
          style={{
            width: 38,
            background: "var(--gg-surface2)",
            border: "1px solid var(--gg-border)",
            color: plan.isFavorite ? "var(--gg-a1)" : "var(--gg-text-muted)",
            fontSize: 18,
          }}
          aria-label={plan.isFavorite ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
          title={plan.isFavorite ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
        >
          {plan.isFavorite ? "★" : "☆"}
        </button>

        {isOwner && (
          <button
            onClick={handleDelete}
            className="flex items-center justify-center rounded-[11px] border-none cursor-pointer"
            style={{
              width: 38,
              background: "var(--gg-surface2)",
              border: "1px solid var(--gg-border)",
              color: "var(--gg-error)",
            }}
            aria-label="Usuń plan"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
});

export const PlansScreen = memo(function PlansScreen({ onCreatePlan, onEditPlan }: PlansScreenProps) {
  const { plans, duplicatePlan, favoritePlan, unfavoritePlan } = useData();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<PlanTab>("favorites");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("az");
  const [showFilters, setShowFilters] = useState(false);

  const userId = user?.id ?? "";

  const tabPlans: Record<PlanTab, WorkoutPlan[]> = {
    favorites: plans.filter((p) => p.isFavorite),
    mine: plans.filter((p) => p.creatorUserId === userId),
    builtin: plans.filter((p) => p.creatorUserId === null),
    community: plans.filter((p) => p.creatorUserId !== null && p.creatorUserId !== userId && p.isPublic),
  };

  const tabs: { id: PlanTab; label: string }[] = [
    { id: "favorites", label: "Ulubione" },
    { id: "mine", label: "Moje" },
    { id: "builtin", label: "Built-in" },
    { id: "community", label: "Społeczność" },
  ];

  const sortFn = (a: WorkoutPlan, b: WorkoutPlan) => {
    if (sort === "az") return a.name.localeCompare(b.name);
    if (sort === "za") return b.name.localeCompare(a.name);
    if (sort === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  };

  const visiblePlans = tabPlans[activeTab]
    .filter((p) => fuzzyMatch(p.name, search))
    .sort(sortFn);

  return (
    <div className="px-5 pt-5 screen-enter">
      {/* Header */}
      <div className="mb-5">
        <p
          className="text-[11px] font-bold uppercase tracking-[0.12em] mb-1"
          style={{ color: "var(--gg-text-muted)" }}
        >
          Twoje plany
        </p>
        <h1
          className="font-barlow font-black leading-none"
          style={{ fontSize: 36, letterSpacing: "-0.03em", color: "var(--gg-text)" }}
        >
          Plany
        </h1>
      </div>

      {/* Star hint */}
      <div
        className="flex items-center gap-2 rounded-[13px] px-4 py-3 mb-4"
        style={{ background: "var(--gg-surface2)", border: "1px solid var(--gg-border)" }}
      >
        <span style={{ color: "var(--gg-a1)", fontSize: 16, flexShrink: 0 }}>★</span>
        <p className="text-[13px]" style={{ color: "var(--gg-text-sub)" }}>
          Zaznacz gwiazdkę przy planie, aby móc wybrać go podczas tworzenia treningu
        </p>
      </div>

      {/* CTA */}
      <button
        onClick={onCreatePlan}
        className="w-full flex items-center justify-center gap-2 font-bold text-[15px] text-white rounded-[16px] border-none cursor-pointer mb-4"
        style={{
          padding: 15,
          background: "var(--gg-grad-btn)",
          boxShadow: "0 4px 22px var(--gg-glow)",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="4" x2="12" y2="20"/>
          <line x1="4" y1="12" x2="20" y2="12"/>
        </svg>
        Stwórz nowy plan
      </button>

      {/* Tabs */}
      <div
        className="flex mb-4 p-1 rounded-[14px]"
        style={{ background: "var(--gg-surface2)", border: "1px solid var(--gg-border)" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 text-[13px] font-bold rounded-[10px] border-none cursor-pointer transition-all"
            style={{
              padding: "8px 0",
              background: activeTab === tab.id ? "var(--gg-surface)" : "transparent",
              color: activeTab === tab.id ? "var(--gg-text)" : "var(--gg-text-muted)",
              boxShadow: activeTab === tab.id ? "0 1px 4px rgba(0,0,0,0.2)" : "none",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search & Sort */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 flex items-center gap-2 rounded-[12px] px-3" style={{ background: "var(--gg-surface2)", border: "1px solid var(--gg-border)", height: 38 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--gg-text-muted)", flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj planów…"
            className="flex-1 bg-transparent border-none outline-none text-[13px]"
            style={{ color: "var(--gg-text)" }}
          />
          {search && (
            <button onClick={() => setSearch("")} className="border-none bg-transparent cursor-pointer p-0" style={{ color: "var(--gg-text-muted)", fontSize: 16, lineHeight: 1 }}>×</button>
          )}
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className="flex items-center justify-center rounded-[12px] border-none cursor-pointer gap-1 px-3 text-[12px] font-bold"
          style={{ background: showFilters ? "var(--gg-a1)" : "var(--gg-surface2)", border: "1px solid var(--gg-border)", color: showFilters ? "white" : "var(--gg-text-sub)", height: 38, flexShrink: 0 }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
          </svg>
          Sortuj
        </button>
      </div>

      {showFilters && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {([ ["az", "A–Z"], ["za", "Z–A"], ["newest", "Najnowsze"], ["oldest", "Najstarsze"] ] as [SortOption, string][]).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setSort(val)}
              className="text-[12px] font-bold rounded-[9px] border-none cursor-pointer px-3 py-1.5"
              style={{ background: sort === val ? "var(--gg-a1)" : "var(--gg-surface2)", color: sort === val ? "white" : "var(--gg-text-sub)", border: "1px solid var(--gg-border)" }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Plan list */}
      {visiblePlans.length === 0 ? (
        <div
          className="text-center py-12"
          style={{ color: "var(--gg-text-muted)" }}
        >
          {activeTab === "favorites" ? (
            <>
              <p className="text-[15px] font-medium mb-1">Brak ulubionych</p>
              <p className="text-[13px]">Kliknij ★ przy planie, aby dodać do ulubionych</p>
            </>
          ) : activeTab === "mine" ? (
            <>
              <p className="text-[15px] font-medium mb-1">Brak planów</p>
              <p className="text-[13px]">Stwórz swój pierwszy plan treningowy</p>
            </>
          ) : activeTab === "builtin" ? (
            <p className="text-[15px] font-medium">Brak wbudowanych planów</p>
          ) : (
            <p className="text-[15px] font-medium">Brak publicznych planów społeczności</p>
          )}
        </div>
      ) : (
        <div>
          {visiblePlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isOwner={plan.creatorUserId === userId}
              onEdit={plan.creatorUserId === userId ? () => onEditPlan(plan) : undefined}
              onDuplicate={async () => {
                try {
                  await duplicatePlan(plan.id);
                } catch {
                  alert("Nie udało się zduplikować planu");
                }
              }}
              onFavoriteToggle={async () => {
                try {
                  if (plan.isFavorite) {
                    await unfavoritePlan(plan.id);
                  } else {
                    await favoritePlan(plan.id);
                  }
                } catch {
                  alert("Nie udało się zmienić ulubionego");
                }
              }}
            />
          ))}
        </div>
      )}

      <div className="h-6" />
    </div>
  );
});
