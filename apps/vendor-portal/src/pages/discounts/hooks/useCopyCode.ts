import { useCallback, useState } from 'react';
import { useToast } from '@sinnapi/ui';

/**
 * Copying a code to the clipboard, and saying that it worked.
 *
 * A discount code exists to be pasted somewhere else — into a caption, a
 * WhatsApp broadcast, a printer's brief — so copying it is the single most
 * common thing done on this screen, and it has to confirm itself: a silent
 * copy leaves a vendor pasting to check, which is slower than retyping.
 *
 * The clipboard API needs a secure context and the user's permission, and
 * refuses in an iframe without one. A failure is reported rather than
 * swallowed, because a vendor who believes they have copied a code and has not
 * will paste whatever was there before.
 */
export function useCopyCode() {
  const toast = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  const { success, error } = toast;

  const copy = useCallback(
    async (code: string) => {
      try {
        await navigator.clipboard.writeText(code);
        setCopied(code);
        success(`${code} copied`);
        // Purely visual: the tick on the button falls back to the copy icon so
        // the next card the vendor reaches for does not look already-done.
        window.setTimeout(() => setCopied((current) => (current === code ? null : current)), 2000);
      } catch {
        error('Could not copy to the clipboard. Select the code and copy it manually.');
      }
    },
    [success, error],
  );

  return { copy, copied, toast: toast.toast, dismissToast: toast.dismiss };
}
