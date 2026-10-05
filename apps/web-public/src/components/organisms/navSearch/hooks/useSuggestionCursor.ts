'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

/** No row is active — the box holds the visitor's own text and Enter searches it. */
export const NO_ACTIVE = -1;

type CursorArgs = {
  /** How many rows the flat list currently holds. */
  count: number;
  /**
   * Changes whenever the rows do — the term they answer. Not derivable from
   * `count`: "pho" and "phot" can both return six rows, and resetting on the
   * length alone would leave the highlight sitting on row 3 of a list whose
   * row 3 is now a different vendor.
   */
  resetKey: string;
  /** Enter, or a click, on the row at this index. */
  onSelect: (index: number) => void;
  /** Enter with no row active: search the typed text. */
  onSubmit: () => void;
  /** Escape with no row active, or Tab out. */
  onClose: () => void;
};

/**
 * Keyboard navigation for the suggestion list, as a combobox rather than a
 * list of links.
 *
 * The distinction matters: focus never leaves the text input. A visitor
 * arrowing through suggestions must still be able to keep typing, and roving
 * real DOM focus into the options would take the caret with it. So the active
 * option is *virtual* — tracked here as an index, published to assistive tech
 * through `aria-activedescendant` by the caller — which is what the ARIA
 * combobox pattern prescribes.
 *
 * Two consequences the caller inherits:
 *
 *  - the browser will not scroll the active option into view the way it does
 *    for real focus, so `activeRef` is handed back for the panel to attach to
 *    the highlighted row and scroll manually;
 *  - the cursor has to be reset whenever the row set changes underneath it,
 *    or "the third row" silently becomes a different vendor mid-keystroke.
 *
 * Arrow keys wrap at both ends. Home/End are deliberately *not* intercepted:
 * in an editable combobox they belong to the caret, and stealing them to jump
 * the list is the kind of small theft that makes a search box feel broken.
 */
export function useSuggestionCursor({ count, resetKey, onSelect, onSubmit, onClose }: CursorArgs) {
  const [activeIndex, setActiveIndex] = useState(NO_ACTIVE);
  const activeRef = useRef<HTMLElement | null>(null);

  // The row set changed (new term, or results arrived) — the old index now
  // points at something else, so nothing is active until the visitor says so.
  useEffect(() => {
    setActiveIndex(NO_ACTIVE);
  }, [count, resetKey]);

  // Browsers don't manage visibility for `aria-activedescendant` targets.
  useEffect(() => {
    if (activeIndex === NO_ACTIVE) return;
    activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const move = useCallback(
    (step: 1 | -1) => {
      if (count === 0) return;
      setActiveIndex((current) => {
        if (current === NO_ACTIVE) return step === 1 ? 0 : count - 1;
        return (current + step + count) % count;
      });
    },
    [count],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown':
          // Preventing default keeps the caret from jumping to the end of the
          // input on every press down the list.
          event.preventDefault();
          move(1);
          break;
        case 'ArrowUp':
          event.preventDefault();
          move(-1);
          break;
        case 'Enter':
          // The form's own submit would fire too; this owns the decision.
          event.preventDefault();
          if (activeIndex !== NO_ACTIVE) onSelect(activeIndex);
          else onSubmit();
          break;
        case 'Escape':
          // Two-stage, as the combobox pattern expects: the first Escape
          // abandons the highlighted row and gives the visitor their own text
          // back; only a second one closes the palette. Letting the first
          // Escape close everything throws away the query they were refining.
          if (activeIndex !== NO_ACTIVE) {
            event.preventDefault();
            event.stopPropagation();
            setActiveIndex(NO_ACTIVE);
          } else {
            onClose();
          }
          break;
        case 'Tab':
          // Focus is leaving; a dropdown left floating over the page with
          // nothing focused in it is a trap for the next Tab.
          onClose();
          break;
        default:
          break;
      }
    },
    [activeIndex, move, onSelect, onSubmit, onClose],
  );

  return { activeIndex, setActiveIndex, handleKeyDown, activeRef };
}
