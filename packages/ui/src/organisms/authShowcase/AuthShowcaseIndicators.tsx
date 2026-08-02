'use client';
import { Box, Stack } from '../../atoms/Layout';
import { alpha } from '../../system';

export interface AuthShowcaseIndicatorsProps {
  count: number;
  activeIndex: number;
  /** Rotation length — drives the active pill's progress fill. */
  rotateMs: number;
  /** False when auto-rotation is off: the pill shows as filled instead of timing. */
  animateProgress?: boolean;
  onSelect: (index: number) => void;
}

/** Progress pills — the active one fills over the rotation interval. */
export function AuthShowcaseIndicators({
  count,
  activeIndex,
  rotateMs,
  animateProgress = true,
  onSelect,
}: AuthShowcaseIndicatorsProps) {
  return (
    <Stack direction="row" spacing={1.25} justifyContent="center" sx={{ mt: 1 }}>
      {Array.from({ length: count }, (_, i) => {
        const active = i === activeIndex;
        return (
          <Box
            key={i}
            component="button"
            type="button"
            aria-label={`Show highlight ${i + 1} of ${count}`}
            aria-current={active}
            onClick={() => onSelect(i)}
            sx={{
              p: 0,
              border: 0,
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              height: 6,
              width: active ? 30 : 6,
              borderRadius: 999,
              bgcolor: (t) => alpha(t.palette.common.white, active ? 0.25 : 0.4),
              transition: 'width .35s cubic-bezier(.22,.61,.36,1), background-color .35s ease',
              '&:hover': { bgcolor: (t) => alpha(t.palette.common.white, active ? 0.25 : 0.6) },
              '&:focus-visible': {
                outline: (t) => `2px solid ${t.palette.secondary.main}`,
                outlineOffset: 3,
              },
            }}
          >
            {active && (
              <Box
                // Re-keyed on the active index so the fill restarts each slide,
                // staying in step with auto-advance and manual selection.
                key={activeIndex}
                sx={{
                  position: 'absolute',
                  inset: 0,
                  transformOrigin: 'left',
                  borderRadius: 'inherit',
                  bgcolor: (t) => t.palette.secondary.main,
                  ...(animateProgress
                    ? {
                        animation: `authShowcaseProgress ${rotateMs}ms linear forwards`,
                        '@keyframes authShowcaseProgress': {
                          from: { transform: 'scaleX(0)' },
                          to: { transform: 'scaleX(1)' },
                        },
                      }
                    : { transform: 'scaleX(1)' }),
                }}
              />
            )}
          </Box>
        );
      })}
    </Stack>
  );
}
