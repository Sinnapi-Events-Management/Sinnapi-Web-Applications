'use client';
import { useCallback, useRef, type KeyboardEvent } from 'react';

export type RadioGroupNavigation = {
  /** Attach to each option, in order, so focus can be moved between them. */
  registerOption: (index: number) => (node: HTMLElement | null) => void;
  /** The option's `tabIndex`: only the selected one sits in the tab order. */
  tabIndexFor: (index: number) => 0 | -1;
  onKeyDown: (event: KeyboardEvent<HTMLElement>, index: number) => void;
};

/**
 * Keyboard behaviour for a custom `role="radiogroup"`, per the WAI-ARIA
 * radio group pattern.
 *
 * The previous picker put every card in the tab order and only answered
 * Enter/Space, which is how a list of buttons behaves, not a radio group: a
 * keyboard user had to tab through all four methods to reach the Pay button,
 * and arrow keys — what a screen reader announces a radio group as accepting —
 * did nothing. Here the group is one tab stop, the arrows move *and select*
 * (radios select on focus), and Home/End jump to the ends.
 */
export function useRadioGroupNavigation({
  count,
  selected,
  onSelect,
  disabled,
}: {
  count: number;
  selected: number;
  onSelect: (index: number) => void;
  disabled?: boolean;
}): RadioGroupNavigation {
  const nodes = useRef<Array<HTMLElement | null>>([]);

  const registerOption = useCallback(
    (index: number) => (node: HTMLElement | null) => {
      nodes.current[index] = node;
    },
    [],
  );

  const move = useCallback(
    (index: number) => {
      onSelect(index);
      nodes.current[index]?.focus();
    },
    [onSelect],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>, index: number) => {
      if (disabled || count === 0) return;
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault();
          move((index + 1) % count);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          move((index - 1 + count) % count);
          break;
        case 'Home':
          event.preventDefault();
          move(0);
          break;
        case 'End':
          event.preventDefault();
          move(count - 1);
          break;
        case ' ':
        case 'Enter':
          event.preventDefault();
          onSelect(index);
          break;
      }
    },
    [count, disabled, move, onSelect],
  );

  const tabIndexFor = useCallback(
    (index: number): 0 | -1 => (!disabled && index === selected ? 0 : -1),
    [disabled, selected],
  );

  return { registerOption, tabIndexFor, onKeyDown };
}
