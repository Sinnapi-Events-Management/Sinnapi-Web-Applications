// Builds a resized Unsplash CDN URL. Images are used only as decorative CSS
// backgrounds layered over a brand-colour fallback, so a failed image degrades
// gracefully. Swap the photo id to change any image.
export const unsplash = (id: string, w = 1200) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;
