import Image from 'next/image';
import { Box, Container, Typography, Chip, Stack, Button } from '@sinnapi/ui/atoms';
import { SecondaryButton } from '@sinnapi/ui/molecules';
import { SupportAgent, EmailOutlined, WhatsApp } from '@mui/icons-material';
import { common, gradientStops, palette, withAlpha } from '@sinnapi/ui/tokens';
import { CONTACT } from '@sinnapi/utils/constants';
import { IMAGES } from '@/lib/assets';

const waNumber = CONTACT.whatsapp.replace(/[^\d]/g, '');

/**
 * Contact hero — mirrors AboutHero's teal-over-photo treatment for brand
 * continuity, but leads with the two fastest ways to reach us (email + WhatsApp)
 * so visitors who don't want a form can act immediately.
 */
export default function ContactHero() {
  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        color: 'common.white',
        backgroundColor: 'primary.dark',
        pt: { xs: 8, md: 13 },
        pb: { xs: 9, md: 14 },
      }}
    >
      {/* Full-bleed background photo. Decorative → empty alt + aria-hidden. */}
      <Image
        src={IMAGES.receptionAutumn.src}
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
          background: `radial-gradient(circle, ${withAlpha(palette.light.secondary.light, 0.32)} 0%, transparent 70%)`,
          filter: 'blur(8px)',
          pointerEvents: 'none',
        }}
      />

      <Container
        sx={{ position: 'relative', maxWidth: 'md', textAlign: { xs: 'left', md: 'center' } }}
      >
        <Chip
          icon={<SupportAgent sx={{ color: 'inherit !important' }} fontSize="small" />}
          label="Get in touch"
          size="small"
          sx={{
            mb: 3,
            color: 'common.white',
            bgcolor: withAlpha(common.white, 0.14),
            fontWeight: 600,
            '& .MuiChip-icon': { color: palette.light.secondary.light },
          }}
        />
        <Typography
          variant="h1"
          sx={{
            color: 'common.white',
            fontSize: { xs: '2.4rem', sm: '3rem', md: '3.6rem' },
            lineHeight: 1.08,
          }}
        >
          We&apos;d love to hear from you
        </Typography>
        <Typography
          variant="h6"
          sx={{
            mt: 2.5,
            fontWeight: 400,
            color: withAlpha(common.white, 0.9),
            maxWidth: 680,
            mx: { md: 'auto' },
          }}
        >
          Questions about booking, becoming a vendor, or partnering with Sinnapi? Send us a message
          and our team will get back to you within one business day.
        </Typography>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ mt: 4, justifyContent: { md: 'center' } }}
        >
          <SecondaryButton
            component="a"
            href={`mailto:${CONTACT.email}`}
            size="large"
            startIcon={<EmailOutlined />}
          >
            Email us
          </SecondaryButton>
          <Button
            component="a"
            href={`https://wa.me/${waNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            variant="outlined"
            size="large"
            startIcon={<WhatsApp />}
            sx={{
              color: 'common.white',
              borderColor: withAlpha(common.white, 0.6),
              '&:hover': {
                borderColor: 'common.white',
                bgcolor: withAlpha(common.white, 0.08),
              },
            }}
          >
            Chat on WhatsApp
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
