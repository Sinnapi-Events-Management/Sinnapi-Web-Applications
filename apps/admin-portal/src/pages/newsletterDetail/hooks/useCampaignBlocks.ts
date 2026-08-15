import { useCallback, useState } from 'react';
import { createBlock, type BlockType, type CampaignBlock } from '../schema';

export type BlocksApi = ReturnType<typeof useCampaignBlocks>;

/**
 * The block list's editing operations, isolated from persistence.
 *
 * Every mutation returns a NEW array and new objects for the blocks it touches,
 * because the composer renders one memoised editor per block: mutating in place
 * would leave React with the same references and no reason to re-render, which
 * is the classic way a WYSIWYG appears to "lose" a keystroke.
 *
 * `dirty` is tracked here rather than by diffing against the server copy. A
 * deep comparison of two ProseMirror documents is both expensive and unreliable
 * (equivalent documents differ in ways that do not matter), and the only
 * consequence of a false positive is a save nobody needed.
 */
export function useCampaignBlocks(initial: CampaignBlock[]) {
  const [blocks, setBlocks] = useState<CampaignBlock[]>(initial);
  const [dirty, setDirty] = useState(false);

  /** Replace the whole list — used when the server copy loads or after a save. */
  const reset = useCallback((next: CampaignBlock[]) => {
    setBlocks(next);
    setDirty(false);
  }, []);

  const markClean = useCallback(() => setDirty(false), []);

  const add = useCallback((type: BlockType) => {
    setBlocks((prev) => [...prev, createBlock(type)]);
    setDirty(true);
  }, []);

  const update = useCallback((id: string, patch: Partial<CampaignBlock>) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? ({ ...b, ...patch } as CampaignBlock) : b)));
    setDirty(true);
  }, []);

  const remove = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setDirty(true);
  }, []);

  const duplicate = useCallback((id: string) => {
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      if (index < 0) return prev;
      // A fresh block of the same type supplies the new id; the spread then
      // overwrites its defaults with the original's content.
      const copy = { ...prev[index], id: createBlock(prev[index].type).id } as CampaignBlock;
      return [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)];
    });
    setDirty(true);
  }, []);

  /** Move one position up or down. A no-op at either end rather than a wrap. */
  const move = useCallback((id: string, direction: -1 | 1) => {
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setDirty(true);
  }, []);

  return { blocks, dirty, reset, markClean, add, update, remove, duplicate, move };
}
