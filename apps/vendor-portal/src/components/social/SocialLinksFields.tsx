import { Box } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import type { Control, FieldValues, Path } from 'react-hook-form';

/** The social columns on `vendors`, in the order they are rendered. */
export const SOCIAL_FIELDS = [
  { name: 'instagram_url', label: 'Instagram' },
  { name: 'tiktok_url', label: 'TikTok' },
  { name: 'linkedin_url', label: 'LinkedIn' },
  { name: 'facebook_url', label: 'Facebook' },
] as const;

type Props<T extends FieldValues> = { control: Control<T>; disabled?: boolean };

/**
 * The four social profiles, two per row from `sm` up.
 *
 * Generic over the form type, and shared rather than owned by either caller: the
 * onboarding step and the profile page's business form have different schemas
 * but write the identical four columns, and two copies is how one of them ends
 * up missing TikTok.
 *
 * A CSS grid, not a `Grid` container: the container lays out by negative
 * margins, and a parent `Stack` resets child margins — on the profile page that
 * pushed the whole block right and past the card's edge. A CSS grid carries no
 * margins, so it sits flush in any parent.
 */
export default function SocialLinksFields<T extends FieldValues>({ control, disabled }: Props<T>) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2.5,
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
      }}
    >
      {SOCIAL_FIELDS.map((field) => (
        <ControlledField
          key={field.name}
          name={field.name as Path<T>}
          control={control}
          label={field.label}
          placeholder="https://…"
          disabled={disabled}
        />
      ))}
    </Box>
  );
}
