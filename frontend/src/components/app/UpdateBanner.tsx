import { useEffect, useState } from "react";
import { applyPwaUpdate, subscribePwaUpdate } from "@/utils/pwaUpdate";

export function UpdateBanner() {
  const [needRefresh, setNeedRefresh] = useState(false);

  useEffect(() => subscribePwaUpdate(setNeedRefresh), []);

  if (!needRefresh) return null;

  return (
    <div
      className="px-4 py-2 flex items-center justify-between gap-3"
      style={{
        background: "var(--gg-active-bg)",
        borderBottom: "1px solid var(--gg-active-border)",
      }}
    >
      <p className="text-[11px] font-semibold" style={{ color: "var(--gg-active-border)" }}>
        Dostępna nowa wersja aplikacji
      </p>
      <button
        type="button"
        onClick={() => void applyPwaUpdate()}
        className="text-[11px] font-bold underline"
        style={{ color: "var(--gg-active-border)" }}
      >
        Odśwież
      </button>
    </div>
  );
}
