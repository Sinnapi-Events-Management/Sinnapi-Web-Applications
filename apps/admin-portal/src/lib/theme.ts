import { createPortalTheme } from '@sinnapi/ui/theme';

// The portal design language — typography scale, component defaults and the
// secondary-forward (gold) colour balance — lives in @sinnapi/ui/theme so admin,
// client and vendor cannot drift apart. See `createPortalTheme` for the
// 60-30-10 rationale and the light/dark canvas treatment.
export const theme = createPortalTheme();
