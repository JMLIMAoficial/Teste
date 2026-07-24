"use client";

import { useState } from "react";
import { MomentUploadModal } from "@/components/moment-upload-modal";

export function MomentUploadFab({ onUploaded }: { onUploaded?: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-deep to-gold text-2xl shadow-lg shadow-purple-deep/30 transition-transform hover:scale-105 active:scale-95"
        aria-label="Publicar momento"
        title="Publicar momento"
      >
        +
      </button>
      <MomentUploadModal
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={() => {
          onUploaded?.();
          window.dispatchEvent(new CustomEvent("companion-moment-uploaded"));
        }}
      />
    </>
  );
}
