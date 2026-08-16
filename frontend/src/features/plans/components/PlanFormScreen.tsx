import { useState, useCallback, memo } from "react";
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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useData } from "@/contexts/data";
import { useAuth } from "@/contexts/AuthContext";
import type { WorkoutPlan } from "@/types";
import { ExerciseSelectionModal } from "@/features/exercises";
import { MUSCLE_GROUPS } from "@/constants/muscleGroups";
import { Switch, Button, FormField } from "@/components/ui";

interface PlanExerciseItem {
  exerciseId: string;
  name: string;
  muscleGroups: string[];
}

function muscleLabel(value: string): string {
  return MUSCLE_GROUPS.find((g) => g.value === value)?.label ?? value;
}

interface SortableExerciseRowProps {
  item: PlanExerciseItem;
  onRemove: () => void;
}

function SortableExerciseRow({ item, onRemove }: SortableExerciseRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.exerciseId });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    background: "var(--gg-surface2)",
    border: "1px solid var(--gg-border)",
    borderRadius: 14,
    padding: "12px 14px",
    marginBottom: 8,
    display: "flex",
    alignItems: "center",
    gap: 12,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="flex items-center justify-center border-none bg-transparent cursor-grab p-0 flex-shrink-0"
        style={{ color: "var(--gg-text-muted)", touchAction: "none" }}
        aria-label="Przeciągnij aby zmienić kolejność"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="5" r="1" fill="currentColor"/>
          <circle cx="9" cy="12" r="1" fill="currentColor"/>
          <circle cx="9" cy="19" r="1" fill="currentColor"/>
          <circle cx="15" cy="5" r="1" fill="currentColor"/>
          <circle cx="15" cy="12" r="1" fill="currentColor"/>
          <circle cx="15" cy="19" r="1" fill="currentColor"/>
        </svg>
      </button>

      {/* Exercise info */}
      <div className="flex-1 min-w-0">
        <p
          className="font-barlow font-bold text-[15px] truncate m-0 leading-tight"
          style={{ color: "var(--gg-text)" }}
        >
          {item.name}
        </p>
        {item.muscleGroups.length > 0 && (
          <p className="text-[11px] m-0 mt-0.5" style={{ color: "var(--gg-text-muted)" }}>
            {item.muscleGroups.map(muscleLabel).join(", ")}
          </p>
        )}
      </div>

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="flex items-center justify-center border-none bg-transparent cursor-pointer p-1 flex-shrink-0 rounded-lg"
        style={{ color: "var(--gg-text-muted)" }}
        aria-label="Usuń ćwiczenie z planu"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
}

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
  const { user } = useAuth();
  const isAdmin = !!user?.isAdmin;
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
  const [shortName, setShortName] = useState(editingPlan?.shortName ?? "");
  const [isPublic, setIsPublic] = useState(editingPlan?.isPublic ?? false);
  const [isGlobal, setIsGlobal] = useState(editingPlan ? editingPlan.creatorUserId === null : false);
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

  const hasPrivateExercise = (isPublic || isGlobal) && items.some((item) => {
    const ex = exercises.find((e) => e.id === item.exerciseId);
    if (!ex) return false;
    const creatorId = ex.creator?.id ?? ex.creatorUserId;
    return creatorId !== null && creatorId !== undefined && creatorId !== "1";
  });

  const validate = (): string | null => {
    if (name.trim().length < 3) return "Nazwa planu musi mieć co najmniej 3 znaki";
    if (name.trim().length > 100) return "Nazwa planu może mieć maksymalnie 100 znaków";
    if (items.length === 0) return "Dodaj co najmniej 1 ćwiczenie";
    if (items.length > 50) return "Plan może zawierać maksymalnie 50 ćwiczeń";
    if (hasPrivateExercise) return "Plan publiczny lub globalny nie może zawierać prywatnych ćwiczeń";
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
        shortName: shortName.trim() || null,
        exerciseIds: items.map((i) => i.exerciseId),
        isPublic: isGlobal ? true : isPublic,
        isGlobal: isAdmin ? isGlobal : undefined,
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
    <>
      <div className="px-5 pt-5 screen-enter">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-[38px] h-[38px] rounded-[12px] flex-shrink-0 cursor-pointer"
          style={{ background: "var(--gg-surface2)", border: "1px solid var(--gg-border)" }}
          aria-label="Wróć"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gg-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] m-0" style={{ color: "var(--gg-text-muted)" }}>
            {isEditing ? "Edycja" : "Nowy plan"}
          </p>
          <h1 className="font-barlow font-black leading-none m-0 mt-0.5" style={{ fontSize: 28, letterSpacing: "-0.02em", color: "var(--gg-text)" }}>
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
      <FormField label="Nazwa planu">
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
      </FormField>

      {/* Short name field */}
      <FormField
        label="Nazwa skrócona"
        optional
        hint="Wpisywana automatycznie jako nazwa treningu przy wyborze planu"
      >
        <input
          type="text"
          value={shortName}
          onChange={(e) => setShortName(e.target.value)}
          placeholder="np. FBW Trening A"
          maxLength={50}
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
      </FormField>

      {/* Admin isGlobal toggle */}
      {isAdmin && (
        <Switch
          checked={isGlobal}
          onChange={setIsGlobal}
          variant="admin"
          badge="ADMIN"
          label="Globalny plan treningowy"
          description="Widoczny dla wszystkich użytkowników w zakładce „Built-in”"
          className="mb-4"
        />
      )}

      {/* isPublic toggle (only when not global) */}
      {!isGlobal && (
        <Switch
          checked={isPublic}
          onChange={setIsPublic}
          variant="accent"
          label="Publiczny plan"
          description="Widoczny dla innych użytkowników"
          className="mb-5"
        />
      )}

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
        <Button
          onClick={handleSave}
          loading={saving}
          loadingText="Zapisywanie..."
          size="lg"
          variant="primary"
          fullWidth
        >
          {isEditing ? "Zapisz zmiany" : "Zapisz plan"}
        </Button>
      </div>

      </div>

      {showExerciseModal && (
        <ExerciseSelectionModal
          onClose={() => setShowExerciseModal(false)}
          onSelectExercise={handleAddExercise}
          existingExerciseIds={existingIds}
          onCreateNewExercise={onCreateNewExercise}
        />
      )}
    </>
  );
});
