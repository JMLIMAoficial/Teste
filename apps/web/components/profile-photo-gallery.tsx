"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type GalleryPhoto = { id: string; url: string; isCover: boolean };

type GalleryContextValue = {
  photos: GalleryPhoto[];
  openAt: (index: number) => void;
};

const GalleryContext = createContext<GalleryContextValue | null>(null);

function useGallery() {
  const ctx = useContext(GalleryContext);
  if (!ctx) throw new Error("ProfilePhotoGalleryProvider required");
  return ctx;
}

function Lightbox({
  photos,
  index,
  onClose,
  onChangeIndex,
}: {
  photos: GalleryPhoto[];
  index: number;
  onClose: () => void;
  onChangeIndex: (index: number) => void;
}) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const photo = photos[index];
  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;

  const goPrev = useCallback(() => {
    if (hasPrev) onChangeIndex(index - 1);
  }, [hasPrev, index, onChangeIndex]);

  const goNext = useCallback(() => {
    if (hasNext) onChangeIndex(index + 1);
  }, [hasNext, index, onChangeIndex]);

  function resetDrag() {
    if (trackRef.current) {
      trackRef.current.style.transform = "";
      trackRef.current.style.transitionDuration = "";
    }
  }

  function setDragOffset(dx: number) {
    if (!trackRef.current) return;
    trackRef.current.style.transform = `translateX(${dx}px)`;
    trackRef.current.style.transitionDuration = dx !== 0 ? "0ms" : "200ms";
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [goNext, goPrev, onClose]);

  useEffect(() => {
    resetDrag();
  }, [index]);

  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-bg-primary/98"
      role="dialog"
      aria-modal="true"
      aria-label="Galeria de fotos"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <p className="text-sm text-text-secondary">
          {index + 1} / {photos.length}
          {photo.isCover && <span className="ml-2 text-gold">· Capa</span>}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-bg-secondary px-3 py-1.5 text-sm text-text-primary hover:bg-bg-tertiary"
          aria-label="Fechar galeria"
        >
          Fechar
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-16">
        {hasPrev && (
          <button
            type="button"
            onClick={goPrev}
            className="absolute left-2 z-10 hidden h-12 w-12 items-center justify-center rounded-full bg-bg-secondary/90 text-2xl text-text-primary transition hover:bg-bg-tertiary md:flex lg:left-4"
            aria-label="Foto anterior"
          >
            ‹
          </button>
        )}

        {hasNext && (
          <button
            type="button"
            onClick={goNext}
            className="absolute right-2 z-10 hidden h-12 w-12 items-center justify-center rounded-full bg-bg-secondary/90 text-2xl text-text-primary transition hover:bg-bg-tertiary md:flex lg:right-4"
            aria-label="Próxima foto"
          >
            ›
          </button>
        )}

        <div
          className="relative h-full w-full max-h-[calc(100dvh-7rem)] max-w-3xl touch-pan-y select-none overflow-hidden"
          onTouchStart={(e) => {
            const t = e.touches[0];
            if (!t) return;
            touchStart.current = { x: t.clientX, y: t.clientY };
            resetDrag();
          }}
          onTouchMove={(e) => {
            const start = touchStart.current;
            const t = e.touches[0];
            if (!start || !t) return;
            const dx = t.clientX - start.x;
            const dy = t.clientY - start.y;
            if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
              setDragOffset(dx);
            }
          }}
          onTouchEnd={(e) => {
            const start = touchStart.current;
            const t = e.changedTouches[0];
            touchStart.current = null;
            if (!start || !t) return;

            const dx = t.clientX - start.x;
            resetDrag();

            if (Math.abs(dx) >= 50) {
              if (dx < 0) goNext();
              else goPrev();
            }
          }}
        >
          <div
            ref={trackRef}
            className="flex h-full w-full items-center justify-center transition-transform duration-200 ease-out"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={photo.id}
              src={photo.url}
              alt=""
              draggable={false}
              className="max-h-[calc(100dvh-7rem)] max-w-full object-contain"
            />
          </div>
        </div>
      </div>

      <p className="pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-xs text-text-muted md:hidden">
        Arraste ← → para trocar a foto
      </p>
    </div>
  );
}

export function ProfilePhotoGalleryProvider({
  photos,
  children,
}: {
  photos: GalleryPhoto[];
  children: ReactNode;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const value = useMemo(
    () => ({
      photos,
      openAt: (index: number) => {
        if (photos.length > 0) setOpenIndex(Math.max(0, Math.min(index, photos.length - 1)));
      },
    }),
    [photos],
  );

  if (photos.length === 0) return <>{children}</>;

  return (
    <GalleryContext.Provider value={value}>
      {children}
      {openIndex !== null && (
        <Lightbox
          photos={photos}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onChangeIndex={setOpenIndex}
        />
      )}
    </GalleryContext.Provider>
  );
}

export function ProfilePhotoTrigger({
  index,
  children,
  className = "",
  label = "Abrir foto",
}: {
  index: number;
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  const { openAt } = useGallery();

  return (
    <button
      type="button"
      onClick={() => openAt(index)}
      className={`cursor-zoom-in ${className}`}
      aria-label={label}
    >
      {children}
    </button>
  );
}

export function ProfilePhotoGrid({ className = "" }: { className?: string }) {
  const { photos, openAt } = useGallery();

  if (photos.length === 0) return null;

  return (
    <div className={`grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 ${className}`}>
      {photos.map((photo, index) => (
        <button
          key={photo.id}
          type="button"
          onClick={() => openAt(index)}
          className="group relative overflow-hidden rounded-xl border border-border-subtle text-left cursor-zoom-in"
          aria-label={`Abrir foto ${index + 1} de ${photos.length}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.url}
            alt=""
            loading="lazy"
            decoding="async"
            className="aspect-[3/4] w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
          {photo.isCover && (
            <span className="absolute left-2 top-2 rounded-md bg-bg-primary/90 px-2 py-0.5 text-[10px] font-semibold text-text-primary md:bg-bg-primary/80 md:backdrop-blur-sm">
              ⭐ Capa
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function resolvePhotoIndex(photos: GalleryPhoto[], url?: string | null) {
  if (!url || photos.length === 0) return 0;
  const byUrl = photos.findIndex((p) => p.url === url);
  if (byUrl >= 0) return byUrl;
  const cover = photos.findIndex((p) => p.isCover);
  return cover >= 0 ? cover : 0;
}
