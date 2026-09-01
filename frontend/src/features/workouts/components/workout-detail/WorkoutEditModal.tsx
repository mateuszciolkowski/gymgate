import { memo, useState, useEffect } from "react";
import { Modal, Button, FormField } from "@/components/ui";

interface WorkoutEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  isCompleted: boolean;
  initialData: {
    workoutName?: string | null;
    gymName?: string | null;
    workoutDate: string;
    durationSeconds?: number | null;
    createdAt?: string;
  };
  onSave: (data: {
    workoutName?: string;
    gymName?: string;
    workoutDate: string;
    durationSeconds?: number;
  }) => Promise<void> | void;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  maxWidth: "100%",
  boxSizing: "border-box",
  padding: "11px 14px",
  borderRadius: 12,
  fontSize: 14,
  color: "var(--gg-text)",
  background: "var(--gg-surface2)",
  border: "1px solid var(--gg-border-med)",
  outline: "none",
  fontFamily: "inherit",
};

function calculateDurationSeconds(start: string, end: string): number {
  const [sh, sm] = (start || "00:00").split(":").map(Number);
  const [eh, em] = (end || "00:00").split(":").map(Number);
  const startSec = (sh || 0) * 3600 + (sm || 0) * 60;
  const endSec = (eh || 0) * 3600 + (em || 0) * 60;
  let diff = endSec - startSec;
  if (diff < 0) diff += 24 * 3600;
  return diff;
}

function fmtDuration(seconds: number | null | undefined): string {
  if (!seconds) return "0 min";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

export const WorkoutEditModal = memo(function WorkoutEditModal({
  isOpen,
  onClose,
  isCompleted,
  initialData,
  onSave,
}: WorkoutEditModalProps) {
  const [workoutName, setWorkoutName] = useState(initialData.workoutName ?? "");
  const [gymName, setGymName] = useState(initialData.gymName ?? "");
  const [workoutDate, setWorkoutDate] = useState(
    initialData.workoutDate ? new Date(initialData.workoutDate).toISOString().split("T")[0] : "",
  );

  // Time handling for completed workouts
  const [startTime, setStartTime] = useState(() => {
    if (initialData.createdAt) {
      return new Date(initialData.createdAt).toTimeString().slice(0, 5);
    }
    return "12:00";
  });

  const [endTime, setEndTime] = useState(() => {
    if (initialData.createdAt && initialData.durationSeconds) {
      const end = new Date(new Date(initialData.createdAt).getTime() + initialData.durationSeconds * 1000);
      return end.toTimeString().slice(0, 5);
    }
    return "13:00";
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setWorkoutName(initialData.workoutName ?? "");
      setGymName(initialData.gymName ?? "");
      setWorkoutDate(
        initialData.workoutDate ? new Date(initialData.workoutDate).toISOString().split("T")[0] : "",
      );

      if (initialData.createdAt) {
        setStartTime(new Date(initialData.createdAt).toTimeString().slice(0, 5));
        if (initialData.durationSeconds) {
          const end = new Date(new Date(initialData.createdAt).getTime() + initialData.durationSeconds * 1000);
          setEndTime(end.toTimeString().slice(0, 5));
        }
      }
    }
  }, [isOpen, initialData]);

  const editedDurationSeconds = isCompleted ? calculateDurationSeconds(startTime, endTime) : null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: {
        workoutName?: string;
        gymName?: string;
        workoutDate: string;
        durationSeconds?: number;
      } = {
        workoutName: workoutName.trim() || undefined,
        gymName: gymName.trim() || undefined,
        workoutDate: workoutDate || new Date().toISOString().split("T")[0],
      };

      if (isCompleted && editedDurationSeconds !== null) {
        payload.durationSeconds = editedDurationSeconds;
      }

      await onSave(payload);
      onClose();
    } catch {
      alert("Nie udało się zapisać zmian");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Szczegóły treningu"
      subtitle={isCompleted ? "Zakończony trening" : "Aktywny trening"}
      maxWidth="md"
    >
      <form onSubmit={handleSave} className="flex flex-col gap-3.5">
        <FormField label="Nazwa treningu" className="mb-0">
          <input
            type="text"
            value={workoutName}
            onChange={(e) => setWorkoutName(e.target.value)}
            placeholder="Nazwa treningu"
            style={inputStyle}
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
          <FormField label="Siłownia" optional className="mb-0 min-w-0">
            <input
              type="text"
              value={gymName}
              onChange={(e) => setGymName(e.target.value)}
              placeholder="Nazwa siłowni"
              style={inputStyle}
            />
          </FormField>

          <FormField label="Data treningu" className="mb-0 min-w-0">
            <input
              type="date"
              value={workoutDate}
              onChange={(e) => setWorkoutDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              style={inputStyle}
            />
          </FormField>
        </div>

        {/* Time range (only for completed workouts) */}
        {isCompleted && (
          <div className="pt-3 border-t" style={{ borderColor: "var(--gg-border)" }}>
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--gg-text-muted)" }}>
              Czas trwania sesji
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
              <div className="min-w-0">
                <label className="block text-[10px] font-medium mb-1" style={{ color: "var(--gg-text-muted)" }}>Rozpoczęcie</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div className="min-w-0">
                <label className="block text-[10px] font-medium mb-1" style={{ color: "var(--gg-text-muted)" }}>Zakończenie</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
            {editedDurationSeconds !== null && (
              <p className="text-[12px] mt-2 font-bold num-tabular" style={{ color: "var(--gg-a2)" }}>
                Czas całkowity: {fmtDuration(editedDurationSeconds)}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2.5 mt-3 pt-3 border-t" style={{ borderColor: "var(--gg-border)" }}>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
          >
            Anuluj
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={saving}
            loadingText="Zapisywanie..."
            fullWidth
          >
            Zapisz zmiany
          </Button>
        </div>
      </form>
    </Modal>
  );
});
