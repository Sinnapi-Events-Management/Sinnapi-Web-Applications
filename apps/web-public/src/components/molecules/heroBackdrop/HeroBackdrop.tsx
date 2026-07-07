import Image from 'next/image';
import { Box } from '@sinnapi/ui/atoms';
import { gradientStops, palette, withAlpha } from '@sinnapi/ui/tokens';
import type { LocalImage } from '@/lib/assets';

export interface HeroBackdropProps {
  /** Full-bleed background photo. Rendered decoratively (behind overlaid copy). */
  image: LocalImage;
  /** Tint for the decorative corner glow. Defaults to the brand gold highlight. */
  accentColor?: string;
}

/**
 * The signature Sinnapi hero backdrop: a full-bleed photo, a brand-teal gradient
 * that keeps overlaid copy legible, and a soft accent glow for depth. Extracted
 * from the About hero so every hero shares one photo-over-teal treatment; the
 * `accentColor` prop lets each surface stay subtly distinct.
 *
 * Purely decorative — the photo carries an empty alt + `aria-hidden` so screen
 * readers skip straight to the hero copy.
 */
export default function HeroBackdrop({
  image,
  accentColor = palette.light.secondary.light,
}: HeroBackdropProps) {
  return (
    <>
      <Image
        src={image.src}
        alt=""
        aria-hidden
        fill
        priority
        placeholder="blur"
        sizes="100vw"
        style={{ objectFit: 'cover', objectPosition: 'center' }}
      />

      {/* Brand teal overlay keeps the copy legible while the photo glows through. */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(135deg, ${withAlpha(gradientStops.tealDeep, 0.95)} 0%, ${withAlpha(palette.light.primary.dark, 0.88)} 50%, ${withAlpha(palette.light.primary.main, 0.62)} 100%)`,
        }}
      />

      {/* Decorative soft glow for depth. */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: { xs: -120, md: -160 },
          right: { xs: -120, md: -80 },
          width: 460,
          height: 460,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${withAlpha(accentColor, 0.32)} 0%, transparent 70%)`,
          filter: 'blur(8px)',
          pointerEvents: 'none',
        }}
      />
    </>
  );
}
