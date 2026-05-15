import { memo, useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useData } from "@/contexts/DataContext";
import type { WorkoutPlan } from "@/types";
import { ExerciseSelectionModal } from "./ExerciseSelectionModal";
import { MUSCLE_GROUPS } from "@/constants/muscleGroups";

interface PlanExerciseItem {
  exerciseId: string;
  name: string;
  muscleGroups: string[];
}

interface SortableExerciseRowProps {
  item: PlanExerciseItem;
  onRemove: () => void;
}

function muscleLabel(value: string): string {
  return MUSCLE_GROUPS.find((g) => g.value === value)?.label ?? value;
}

const SortableExerciseRow = memo(function SortableExerciseRow({ item, onRemove }: SortableExerciseRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.exerciseId,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 14px",
        borderRadius: 14,
        background: "var(--gg-surface2)",
        border: "1.5px solid var(--gg-border)",
        marginBottom: 8,
      }}
    >
      {/* Drag handle */}
      <span
        {...attributes}
        {...listeners}
        style={{ color: "var(--gg-text-muted)", cursor: "grab", touchAction: "none", flexShrink: 0 }}
        aria-label="Przeciągnij"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="5" r="1" fill="currentColor"/>
          <circle cx="15" cy="5" r="1" fill="currentColor"/>
          <circle cx="9" cy="12" r="1" fill="currentColor"/>
          <circle cx="15" cy="12" r="1" fill="currentColor"/>
          <circle cx="9" cy="19" r="1" fill="currentColor"/>
          <circle cx="15" cy="19" r="1" fill="currentColor"/>
        </svg>
      </span>

      {/* Exercise info */}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium truncate" style={{ color: "var(--gg-text)" }}>
          {item.name}
        </p>
        {item.muscleGroups.length > 0 && (
          <p className="text-[11px] mt-0.5" style={{ color: "var(--gg-text-muted)" }}>
            {muscleLabel(item.muscleGroups[0])}
          </p>
        )}
      </div>

      {/* Remove */}
      <button
        onClick={onRemove}
        className="flex items-center justify-center rounded-[10px] border-none cursor-pointer flex-shrink-0"
        style={{
          width: 32,
          height: 32,
          background: "var(--gg-surface)",
          border: "1px solid var(--gg-border)",
          color: "var(--gg-error)",
        }}
        aria-label="Usuń ćwiczenie"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
});

interface PlanFormScreenProps {
  editingPlan?: WorkoutPlan | null;
  onBack: () => void;
  onSaved: () => void;
  onCreateNewExercise?: () => void;
}

export const PlanFormScreen = memo(function PlanFormScreen({
  editingPlan,
  onBack,
  onSaved,
  onCreateNewExercise,
}: PlanFormScreenProps) {
  const { createPlan, updatePlan, exercises } = useData();
  const isEditing = !!editingPlan;

  const buildInitialItems = (): PlanExerciseItem[] => {
    if (!editingPlan) return [];
    return editingPlan.items
      .slice()
      .sort((a, b) => a.orderInPlan - b.orderInPlan)
      .map((item) => ({
        exerciseId: item.exerciseId,
        name: item.exercise.name,
        muscleGroups: item.exercise.muscleGroups,
      }));
  };

  const [name, setName] = useState(editingPlan?.name ?? "");
  const [isPublic, setIsPublic] = useState(editingPlan?.isPublic ?? false);
  const [items, setItems] = useState<PlanExerciseItem[]>(buildInitialItems);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIndex = prev.findIndex((i) => i.exerciseId === active.id);
      const newIndex = prev.findIndex((i) => i.exerciseId === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  }, []);

  const handleAddExercise = useCallback((exerciseId: string) => {
    const exercise = exercises.find((e) => e.id === exerciseId);
    if (!exercise) return;
    setItems((prev) => [
      ...prev,
      { exerciseId: exercise.id, name: exercise.name, muscleGroups: exercise.muscleGroups },
    ]);
    setShowExerciseModal(false);
  }, [exercises]);

  const handleRemove = useCallback((exerciseId: string) => {
    setItems((prev) => prev.filter((i) => i.exerciseId !== exerciseId));
  }, []);

  const hasPrivateExercise = isPublic && items.some((item) => {
    const ex = exercises.find((e) => e.id === item.exerciseId);
    return ex?.creator !== null && ex?.creator !== undefined;
  });

  const validate = (): string | null => {
    if (name.trim().length < 3) return "Nazwa planu musi mieć co najmniej 3 znaki";
    if (name.trim().length > 100) return "Nazwa planu może mieć maksymalnie 100 znaków";
    if (items.length === 0) return "Dodaj co najmniej 1 ćwiczenie";
    if (items.length > 50) return "Plan może zawierać maksymalnie 50 ćwiczeń";
    if (hasPrivateExercise) return "Nie możesz upublicznić planu zawierającego własne ćwiczenia";
    return null;
  };

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        exerciseIds: items.map((i) => i.exerciseId),
        isPublic,
      };

      if (isEditing && editingPlan) {
        await updatePlan(editingPlan.id, payload);
      } else {
        await createPlan(payload);
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd zapisu planu");
    } finally {
      setSaving(false);
    }
  };

  const existingIds = items.map((i) => i.exerciseId);

  return (
    <div className="px-5 pt-5 screen-enter">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-[38px] h-[38px] rounded-[12px] flex-shrink-0"
          style={{ background: "var(--gg-surface2)", border: "1px solid var(--gg-border)" }}
          aria-label="Wróć"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gg-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--gg-text-muted)" }}>
            {isEditing ? "Edycja" : "Nowy plan"}
          </p>
          <h1 className="font-barlow font-black leading-none" style={{ fontSize: 28, letterSpacing: "-0.02em", color: "var(--gg-text)" }}>
            {isEditing ? "Edytuj plan" : "Tworzenie planu"}
          </h1>
        </div>
        <button
          onClick={onBack}
          className="ml-auto text-[14px] font-medium border-none bg-transparent cursor-pointer"
          style={{ color: "var(--gg-text-muted)" }}
        >
          Anuluj
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          className="mb-4 px-4 py-3 rounded-[12px] text-[13px] font-medium"
          style={{ background: "rgba(239,68,68,0.12)", color: "var(--gg-error)", border: "1px solid rgba(239,68,68,0.25)" }}
        >
          {error}
        </div>
      )}

      {/* Name field */}
      <div className="mb-4">
        <label
          className="block text-[12px] font-bold uppercase tracking-[0.06em] mb-2"
          style={{ color: "var(--gg-text-sub)" }}
        >
          Nazwa planu
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="np. FBW Klatka Piersiowa"
          maxLength={100}
          style={{
            width: "100%",
            padding: "13px 14px",
            borderRadius: 14,
            fontSize: 14,
            color: "var(--gg-text)",
            background: "var(--gg-surface2)",
            border: "1.5px solid var(--gg-border)",
            outline: "none",
            fontFamily: "'DM Sans', sans-serif",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* isPublic toggle */}
      <div
        className="flex items-center justify-between mb-5 px-4 py-3 rounded-[14px]"
        style={{ background: "var(--gg-surface2)", border: "1.5px solid var(--gg-border)" }}
      >
        <div>
          <p className="text-[14px] font-medium" style={{ color: "var(--gg-text)" }}>Publiczny plan</p>
          <p className="text-[12px]" style={{ color: "var(--gg-text-muted)" }}>Widoczny dla innych użytkowników</p>
        </div>
        <button
          role="switch"
          aria-checked={isPublic}
          onClick={() => setIsPublic((v) => !v)}
          className="relative flex-shrink-0 rounded-full border-none cursor-pointer transition-all duration-200"
          style={{
            width: 48,
            height: 28,
            background: isPublic ? "var(--gg-a1)" : "var(--gg-surface3)",
            padding: 2,
          }}
        >
          <span
            className="block rounded-full transition-all duration-200"
            style={{
              width: 24,
              height: 24,
              background: "white",
              transform: isPublic ? "translateX(20px)" : "translateX(0)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }}
          />
        </button>
      </div>

      {/* Exercise list */}
      <div className="mb-2">
        <label
          className="block text-[12px] font-bold uppercase tracking-[0.06em] mb-2"
          style={{ color: "var(--gg-text-sub)" }}
        >
          Ćwiczenia{" "}
          <span style={{ color: "var(--gg-text-muted)", textTransform: "none", fontWeight: 400 }}>
            ({items.length}/50)
          </span>
        </label>

        {items.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((i) => i.exerciseId)}
              strategy={verticalListSortingStrategy}
            >
              {items.map((item) => (
                <SortableExerciseRow
                  key={item.exerciseId}
                  item={item}
                  onRemove={() => handleRemove(item.exerciseId)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}

        {items.length < 50 && (
          <button
            onClick={() => setShowExerciseModal(true)}
            className="w-full flex items-center justify-center gap-2 text-[14px] font-medium rounded-[14px] border-none cursor-pointer"
            style={{
              padding: "13px 0",
              background: "transparent",
              border: "1.5px dashed var(--gg-border-med)",
              color: "var(--gg-text-muted)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="4" x2="12" y2="20"/>
              <line x1="4" y1="12" x2="20" y2="12"/>
            </svg>
            Dodaj ćwiczenie
          </button>
        )}
      </div>

      {/* Save button */}
      <div className="pt-4 pb-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full font-bold text-[15px] text-white rounded-[16px] border-none cursor-pointer"
          style={{
            padding: 15,
            background: saving ? "var(--gg-surface3)" : "var(--gg-grad-btn)",
            boxShadow: saving ? "none" : "0 4px 22px var(--gg-glow)",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Zapisywanie…" : isEditing ? "Zapisz zmiany" : "Zapisz plan"}
        </button>
      </div>

      {/* Exercise selection modal */}
      {showExerciseModal && (
        <ExerciseSelectionModal
          onClose={() => setShowExerciseModal(false)}
          onSelectExercise={handleAddExercise}
          existingExerciseIds={existingIds}
          onCreateNewExercise={onCreateNewExercise}
        />
      )}
    </div>
  );
});
