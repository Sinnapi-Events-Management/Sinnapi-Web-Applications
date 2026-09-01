import { Box } from '@sinnapi/ui';
import { alpha } from '@mui/material/styles';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';

/** The palette slots a placeholder may draw from, in the theme's own language. */
const TINTS = ['secondary', 'primary', 'info', 'success'] as const;

/** Stable per-title, so a campaign keeps its colour across reloads and sorts. */
function tintFor(seed: string): (typeof TINTS)[number] {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return TINTS[Math.abs(hash) % TINTS.length];
}

/**
 * The band across the top of a campaign card.
 *
 * Falls back to a tinted gradient rather than a grey box or nothing at all: a
 * promotions grid is a marketing surface, and a card with a hole where its
 * artwork goes reads as broken, while a card with no band at all makes the two
 * kinds of campaign look like two different features. The tint is derived from
 * the title so an un-illustrated grid still has enough variation to scan.
 *
 * Both the image and the placeholder are drawn through the theme's alpha rather
 * than fixed colours, so the band sits on the warm dark canvas as comfortably as
 * on the light one. `aspectRatio` matches the 16:7 the uploader crops to, so
 * what the vendor approved in the dialog is the crop that ships.
 */
export default function PromotionBanner({ url, title }: { url: string | null; title: string }) {
  if (url) {
    return (
      <Box
        component="img"
        src={url}
        alt=""
        loading="lazy"
        sx={{
          width: '100%',
          aspectRatio: '16 / 7',
          objectFit: 'cover',
          display: 'block',
          bgcolor: (t) => alpha(t.palette.text.primary, 0.06),
        }}
      />
    );
  }

  const tint = tintFor(title);

  return (
    <Box
      aria-hidden
      sx={{
        width: '100%',
        aspectRatio: '16 / 7',
        display: 'grid',
        placeItems: 'center',
        background: (t) =>
          `linear-gradient(135deg, ${alpha(t.palette[tint].main, 0.28)} 0%, ${alpha(
            t.palette[tint].main,
            0.06,
          )} 100%)`,
      }}
    >
      <CampaignOutlinedIcon
        sx={{ fontSize: 44, color: (t) => alpha(t.palette[tint].main, 0.55) }}
      />
    </Box>
  );
}
