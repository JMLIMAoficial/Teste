export type GalleryPhoto = { id: string; url: string; isCover: boolean };

export function resolvePhotoIndex(photos: GalleryPhoto[], url?: string | null) {
  if (!url || photos.length === 0) return 0;
  const byUrl = photos.findIndex((p) => p.url === url);
  if (byUrl >= 0) return byUrl;
  const cover = photos.findIndex((p) => p.isCover);
  return cover >= 0 ? cover : 0;
}
