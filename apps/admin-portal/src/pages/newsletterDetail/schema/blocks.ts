import type { JSONContent } from '@tiptap/react';

/**
 * The campaign body model.
 *
 * MUST stay in step with `supabase/functions/_shared/newsletterBlocks.ts`,
 * which is the renderer these blocks are sent through. The two are deliberately
 * separate files rather than a shared package: Edge Functions are bundled by
 * the Supabase CLI, which only follows relative / npm / https specifiers and
 * cannot import from a workspace package. The same constraint already applies
 * to the brand palette and the contact block in `_shared/emailTemplate.ts`.
 *
 * Adding a block type therefore means three edits, in this order:
 *   1. this file (the editor's model)
 *   2. `_shared/newsletterBlocks.ts` (`renderBlock` + `plainBlock`)
 *   3. a block editor component under `../components/molecules/blockEditors`
 * A type added here but not there renders as nothing — which is the safe
 * direction to fail, but is still a bug.
 */
export type BlockType =
  | 'hero'
  | 'heading'
  | 'richText'
  | 'image'
  | 'button'
  | 'articleCard'
  | 'list'
  | 'quote'
  | 'divider'
  | 'spacer';

export type HeroBlock = {
  id: string;
  type: 'hero';
  eyebrow?: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  imageAlt?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export type HeadingBlock = { id: string; type: 'heading'; text: string };

/** `doc` is TipTap's ProseMirror JSON — never HTML. See `newsletterBlocks.ts`. */
export type RichTextBlock = { id: string; type: 'richText'; doc: JSONContent };

export type ImageBlock = {
  id: string;
  type: 'image';
  src: string;
  alt: string;
  href?: string;
  caption?: string;
};

export type ButtonBlock = { id: string; type: 'button'; label: string; href: string };

export type ArticleCardBlock = {
  id: string;
  type: 'articleCard';
  title: string;
  href: string;
  excerpt?: string;
  imageUrl?: string;
  imageAlt?: string;
  tag?: string;
  linkLabel?: string;
};

export type ListBlock = { id: string; type: 'list'; items: string[]; ordered?: boolean };
export type QuoteBlock = { id: string; type: 'quote'; text: string; attribution?: string };
export type DividerBlock = { id: string; type: 'divider' };
export type SpacerBlock = { id: string; type: 'spacer'; height: number };

export type CampaignBlock =
  | HeroBlock
  | HeadingBlock
  | RichTextBlock
  | ImageBlock
  | ButtonBlock
  | ArticleCardBlock
  | ListBlock
  | QuoteBlock
  | DividerBlock
  | SpacerBlock;

export const BLOCK_META: Record<BlockType, { label: string; hint: string }> = {
  hero: { label: 'Hero', hint: 'Headline, standfirst, image and a call to action.' },
  heading: { label: 'Heading', hint: 'A section break inside a long body.' },
  richText: { label: 'Text', hint: 'Formatted paragraphs, lists and links.' },
  image: { label: 'Image', hint: 'A full-width picture, optionally linked.' },
  button: { label: 'Button', hint: 'A single, prominent call to action.' },
  articleCard: { label: 'Article card', hint: 'A digest entry with a read-more link.' },
  list: { label: 'Bullet list', hint: 'Short lines with markers.' },
  quote: { label: 'Quote', hint: 'A testimonial or pull quote.' },
  divider: { label: 'Divider', hint: 'A hairline rule.' },
  spacer: { label: 'Spacer', hint: 'Vertical breathing room.' },
};

/** Order the "add block" menu offers them in — most-used first, not alphabetical. */
export const BLOCK_ORDER: BlockType[] = [
  'richText',
  'heading',
  'image',
  'button',
  'articleCard',
  'quote',
  'list',
  'hero',
  'divider',
  'spacer',
];

/**
 * `crypto.randomUUID` where available.
 *
 * The id is editor-local: it keys React lists and drives move/remove, and it is
 * stripped before nothing — it goes to the database with the block and is
 * simply ignored by the renderer. That is cheaper than maintaining a parallel
 * index and means a reorder cannot desynchronise the editor from its data.
 */
function blockId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `b-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

const EMPTY_DOC: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] };

/** A new block of `type`, with placeholder-free defaults so nothing ships blank. */
export function createBlock(type: BlockType): CampaignBlock {
  const id = blockId();
  switch (type) {
    case 'hero':
      return { id, type, title: '', subtitle: '' };
    case 'heading':
      return { id, type, text: '' };
    case 'richText':
      return { id, type, doc: EMPTY_DOC };
    case 'image':
      return { id, type, src: '', alt: '' };
    case 'button':
      return { id, type, label: '', href: '' };
    case 'articleCard':
      return { id, type, title: '', href: '' };
    case 'list':
      return { id, type, items: [''] };
    case 'quote':
      return { id, type, text: '' };
    case 'divider':
      return { id, type };
    case 'spacer':
      return { id, type, height: 24 };
  }
}

/**
 * Is this block complete enough to send?
 *
 * Used to block scheduling rather than to nag while typing. The rules are all
 * "would this render as something broken or empty in a mailbox": an image with
 * no `src`, a button with no destination, a text block nobody typed into.
 * Anything cosmetic is left alone — a hero without a subtitle is a choice.
 */
export function blockIssue(block: CampaignBlock): string | null {
  switch (block.type) {
    case 'hero':
      if (!block.title.trim()) return 'Hero needs a headline';
      if (Boolean(block.ctaLabel) !== Boolean(block.ctaHref))
        return 'Hero button needs both a label and a link';
      return null;
    case 'heading':
      return block.text.trim() ? null : 'Heading is empty';
    case 'richText':
      return hasText(block.doc) ? null : 'Text block is empty';
    case 'image':
      if (!block.src.trim()) return 'Image needs a URL';
      // Not pedantry: roughly a third of recipients see the alt text and not
      // the image, and an uncaptioned broken image is a hole in the newsletter.
      if (!block.alt.trim()) return 'Image needs alt text';
      return null;
    case 'button':
      if (!block.label.trim()) return 'Button needs a label';
      if (!block.href.trim()) return 'Button needs a link';
      return null;
    case 'articleCard':
      if (!block.title.trim()) return 'Article card needs a title';
      if (!block.href.trim()) return 'Article card needs a link';
      return null;
    case 'list':
      return block.items.some((i) => i.trim()) ? null : 'List has no items';
    case 'quote':
      return block.text.trim() ? null : 'Quote is empty';
    default:
      return null;
  }
}

/** Does a ProseMirror document contain any actual text? */
function hasText(doc: JSONContent | undefined): boolean {
  if (!doc) return false;
  if (typeof doc.text === 'string' && doc.text.trim()) return true;
  return (doc.content ?? []).some(hasText);
}

/**
 * Coerce whatever came out of the `blocks` jsonb column into editable blocks.
 *
 * The column is `unknown` at the type level and genuinely arbitrary at runtime
 * — an older schema, a hand-edited row. Anything unrecognised is dropped rather
 * than rendered, and every block is given an id if it lacks one so the editor's
 * list keys stay stable.
 */
export function parseBlocks(raw: unknown): CampaignBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((b): b is Record<string, unknown> => Boolean(b) && typeof b === 'object')
    .filter((b) => typeof b.type === 'string' && b.type in BLOCK_META)
    .map((b) => ({ ...b, id: typeof b.id === 'string' ? b.id : blockId() }) as CampaignBlock);
}
