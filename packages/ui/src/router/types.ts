import type { LinkProps as MuiLinkProps } from '@mui/material';
import type { LinkProps as RouterLinkProps } from 'react-router-dom';

/** Navigation props forwarded verbatim to react-router's `Link`. */
type ForwardedRouterProps = Pick<
  RouterLinkProps,
  'to' | 'replace' | 'state' | 'preventScrollReset' | 'reloadDocument'
>;

/**
 * `AppLink` owns the anchor rendering, so `href`, `component` and `underline`
 * are intentionally not overridable — use `to` for navigation instead.
 */
export interface AppLinkProps
  extends Omit<MuiLinkProps, 'href' | 'component' | 'underline'>, ForwardedRouterProps {}

export interface AuthSwitchPromptProps {
  /** Muted lead-in, e.g. "Already have an account?". */
  question: string;
  /** Link text, e.g. "Sign in". */
  actionLabel: string;
  /** Route the link navigates to. */
  to: RouterLinkProps['to'];
}
