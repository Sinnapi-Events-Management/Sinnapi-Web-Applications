// Home is revalidated periodically (ISR) for fresh featured vendors & events.
// Route-segment config must live in the page file; page content lives in the
// home container under @/containers/home.
export const revalidate = 3600;

export { default } from '@/containers/home';
