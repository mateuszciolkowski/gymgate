import { memo, useState, useEffect } from "react";
import { Modal, Button } from "@/components/ui";

interface WorkoutNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialNotes?: string | null;
  onSave: (notes: string) => Promise<void> | void;
}

export const WorkoutNotesModal = memo(function WorkoutNotesModal({
  isOpen,
  onClose,
  initialNotes,
  onSave,
}: WorkoutNotesModalProps) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNotes(initialNotes ?? "");
    }
  }, [isOpen, initialNotes]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(notes.trim());
      onClose();
    } catch {
      alert("Nie udało się zapisać notatek");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Notatki do treningu"
      subtitle="Sesja treningowa"
      maxWidth="md"
    >
      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--gg-text-muted)" }}>
            Treść notatki
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Wpisz uwagi ogólne do tego treningu..."
            rows={4}
            autoFocus
            className="w-full p-3.5 rounded-xl text-[14px] outline-none transition-colors"
            style={{
              color: "var(--gg-text)",
              background: "var(--gg-surface2)",
              border: "1px solid var(--gg-border-med)",
              resize: "none",
              fontFamily: "inherit",
            }}
          />
        </div>

        <div className="flex gap-2.5 pt-3 border-t" style={{ borderColor: "var(--gg-border)" }}>
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
            Zapisz notatki
          </Button>
        </div>
      </form>
    </Modal>
  );
});
