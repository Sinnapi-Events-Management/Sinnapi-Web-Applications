/**
 * What a toast is, as data.
 *
 * A message and a severity, never a component: the hooks that own a flow decide
 * *what happened*, and only the `Toast` molecule decides what that looks like.
 * Keeping the two apart is what stops "the send finished" from being phrased as
 * a colour in four different places.
 */
export type ToastSeverity = 'success' | 'info' | 'warning' | 'error';

export type ToastMessage = {
  message: string;
  severity: ToastSeverity;
};
