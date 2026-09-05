import { useState } from "react";
import { createPortal } from "react-dom";
import { Modal } from "@/components/ui/Modal";
import { PhotoIcon } from "@/components/icons";
import { API_BASE } from "@/config/api";

interface ExercisePhoto {
  id: string;
  photoStage: string;
  photoUrl: string;
}

const STAGE_LABELS: Record<string, string> = {
  START: "Pozycja startowa",
  MIDDLE: "Pozycja pośrednia",
  END: "Pozycja końcowa",
};

function resolvePhotoUrl(photoUrl: string): string {
  if (/^https?:\/\//.test(photoUrl)) return photoUrl;
  return `${API_BASE}/uploads/${photoUrl.replace(/^\/?uploads\//, "")}`;
}

export function ExercisePhotoButton({ photos, exerciseName }: { photos?: ExercisePhoto[]; exerciseName: string }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!photos || photos.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        className="w-8 h-8 rounded-lg border-none cursor-pointer flex items-center justify-center shrink-0 transition-colors"
        style={{ background: "var(--gg-surface2)", color: "var(--gg-text-sub)", minHeight: 32 }}
        title="Pokaż zdjęcie"
      >
        <PhotoIcon className="w-[13px] h-[13px] shrink-0" />
      </button>

      {createPortal(
        <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={exerciseName} maxWidth="md">
          <div className="flex flex-col gap-3">
            {photos.map((photo) => (
              <div key={photo.id}>
                {photos.length > 1 && (
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--gg-text-muted)" }}>
                    {STAGE_LABELS[photo.photoStage] ?? photo.photoStage}
                  </p>
                )}
                <img
                  src={resolvePhotoUrl(photo.photoUrl)}
                  alt={STAGE_LABELS[photo.photoStage] ?? photo.photoStage}
                  className="w-full rounded-xl"
                  style={{ border: "1px solid var(--gg-border)" }}
                />
              </div>
            ))}
          </div>
        </Modal>,
        document.body,
      )}
    </>
  );
}
