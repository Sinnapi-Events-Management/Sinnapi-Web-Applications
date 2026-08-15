// Campaign body renderer: `newsletter_campaigns.blocks` (JSON) -> email HTML
// and its plain-text counterpart.
//
// ── The security argument for this file existing ───────────────────────────
// The obvious design is "store the WYSIWYG's HTML, sanitise it on the way out".
// That puts an HTML parser and an allowlist on the path between an operator's
// keyboard and every customer's inbox, and every sanitiser bug is then a stored
// XSS in a document we deliver ourselves. It also fails on its own terms: the
// HTML a rich-text editor emits (<p>, <ul>, semantic <strong>) is not the HTML
// that survives Outlook's Word engine, so it would need rewriting anyway.
//
// So nothing here ever handles operator-authored markup. The composer stores
// TipTap's ProseMirror *document JSON* — a typed tree of nodes and marks — and
// this module walks that tree, emitting only markup it wrote itself, with every
// text leaf escaped. An unknown node type renders as nothing rather than as
// itself. There is no code path by which a `<script>`, a `<style>`, an
// `onerror=`, or a `javascript:` href can reach a recipient, because there is
// no code path by which arbitrary markup is ever parsed.
//
// ── The rendering argument ─────────────────────────────────────────────────
// Every block maps onto a helper in `./newsletterTemplate.ts`, which is where
// the table discipline, the VML fallbacks and the dark-mode handling live. The
// composer can therefore only produce combinations that already render
// correctly — a WYSIWYG whose output is guaranteed by construction rather than
// by testing each campaign.
import {
  emailDivider,
  emailList,
  escapeHtml,
  escapeUrl,
  brandColors,
  emailFonts,
} from './emailTemplate.ts';
import {
  newsletterArticleCard,
  newsletterButton,
  newsletterHero,
  newsletterImage,
  newsletterQuote,
  newsletterSpacer,
} from './newsletterTemplate.ts';

const c = brandColors;

// ───────────────────────────────────────────────────────────────────────────
// Document model — mirrors what TipTap's StarterKit + Link produce
// ───────────────────────────────────────────────────────────────────────────

export type RichMark =
  | { type: 'bold' }
  | { type: 'italic' }
  | { type: 'strike' }
  | { type: 'code' }
  | { type: 'link'; attrs?: { href?: string } };

export type RichNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: RichMark[];
  content?: RichNode[];
};

export type RichDoc = { type: 'doc'; content?: RichNode[] };

export type NewsletterBlock =
  | {
      type: 'hero';
      eyebrow?: string;
      title: string;
      subtitle?: string;
      imageUrl?: string;
      imageAlt?: string;
      ctaLabel?: string;
      ctaHref?: string;
    }
  | { type: 'heading'; text: string }
  | { type: 'richText'; doc: RichDoc }
  | { type: 'image'; src: string; alt: string; href?: string; caption?: string }
  | { type: 'button'; label: string; href: string }
  | {
      type: 'articleCard';
      title: string;
      href: string;
      excerpt?: string;
      imageUrl?: string;
      imageAlt?: string;
      tag?: string;
      linkLabel?: string;
    }
  | { type: 'list'; items: string[]; ordered?: boolean }
  | { type: 'quote'; text: string; attribution?: string }
  | { type: 'divider' }
  | { type: 'spacer'; height?: number };

// ───────────────────────────────────────────────────────────────────────────
// Rich text — inline
// ───────────────────────────────────────────────────────────────────────────

/**
 * Apply a text node's marks, innermost-first.
 *
 * Order matters for `link`: it is applied last so the anchor wraps any emphasis
 * rather than being nested inside it, which is what Outlook needs to keep the
 * whole run clickable. `code` carries its own background, so it is applied
 * before the link for the same reason.
 */
function renderText(node: RichNode): string {
  let html = escapeHtml(node.text ?? '');
  if (!html) return '';

  const marks = node.marks ?? [];
  const has = (t: string) => marks.some((m) => m.type === t);

  if (has('code')) {
    html = `<span style="font-family:${emailFonts.mono};font-size:14px;background:${c.bgSubtle};border:1px solid ${c.divider};border-radius:4px;padding:1px 5px">${html}</span>`;
  }
  if (has('bold')) html = `<strong style="font-weight:700">${html}</strong>`;
  if (has('italic')) html = `<em>${html}</em>`;
  if (has('strike')) html = `<span style="text-decoration:line-through">${html}</span>`;

  const link = marks.find((m) => m.type === 'link') as
    | { type: 'link'; attrs?: { href?: string } }
    | undefined;
  if (link?.attrs?.href) {
    // `escapeUrl` anchors the scheme to http(s)/mailto/tel and returns '#' for
    // anything else, so a `javascript:` href pasted into the editor becomes an
    // inert anchor rather than a live one.
    html = `<a href="${escapeUrl(link.attrs.href)}" style="color:${c.primaryMain};text-decoration:underline">${html}</a>`;
  }
  return html;
}

/** Concatenate a node's inline children. Unknown inline types contribute nothing. */
function renderInline(nodes: RichNode[] | undefined): string {
  if (!nodes) return '';
  return nodes
    .map((n) => {
      if (n.type === 'text') return renderText(n);
      if (n.type === 'hardBreak') return '<br/>';
      // A nested block inside an inline context is malformed input; recurse
      // rather than drop, so pasted content degrades to its text.
      return renderInline(n.content);
    })
    .join('');
}

/** Flatten a subtree to plain text, for the text/plain part. */
function plainInline(nodes: RichNode[] | undefined): string {
  if (!nodes) return '';
  return nodes
    .map((n) => {
      if (n.type === 'text') {
        const link = (n.marks ?? []).find((m) => m.type === 'link') as
          | { attrs?: { href?: string } }
          | undefined;
        // The URL is spelled out rather than dropped: in the text part there is
        // no anchor to carry it, and a call to action pointing nowhere is worse
        // than a slightly noisy line.
        return link?.attrs?.href ? `${n.text ?? ''} (${link.attrs.href})` : (n.text ?? '');
      }
      if (n.type === 'hardBreak') return '\n';
      return plainInline(n.content);
    })
    .join('');
}

const P_STYLE =
  `margin:0 0 16px;font-family:${emailFonts.body};font-size:16px;` +
  `line-height:26px;color:${c.textPrimary};mso-line-height-rule:exactly`;

/** Walk one block-level rich-text node. Unknown types render as nothing. */
function renderRichNode(node: RichNode): string {
  switch (node.type) {
    case 'paragraph': {
      const inner = renderInline(node.content);
      // An empty paragraph is the editor's blank line, and readers use it as
      // spacing — collapsing it silently reflows what they wrote.
      return inner ? `<p style="${P_STYLE}">${inner}</p>` : '<p style="margin:0 0 16px">&nbsp;</p>';
    }
    case 'heading': {
      const level = Math.min(Math.max(Number(node.attrs?.level ?? 2), 2), 3);
      const size = level === 2 ? 21 : 18;
      return (
        `<h${level} style="margin:28px 0 12px;font-family:${emailFonts.heading};font-size:${size}px;` +
        `line-height:${size + 8}px;font-weight:600;color:${c.primaryMain};mso-line-height-rule:exactly">` +
        `${renderInline(node.content)}</h${level}>`
      );
    }
    case 'bulletList':
    case 'orderedList': {
      // Delegated to `emailList`, which renders as a table — Outlook and Gmail
      // disagree wildly on <ul>/<ol> indentation and marker styling.
      const items = (node.content ?? [])
        .filter((li) => li.type === 'listItem')
        .map((li) => (li.content ?? []).map((child) => renderInline(child.content)).join('<br/>'));
      return items.length ? emailList(items, { ordered: node.type === 'orderedList' }) : '';
    }
    case 'blockquote':
      return (
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0">` +
        `<tr><td width="3" bgcolor="${c.primaryLighter}" style="width:3px;background:${c.primaryLighter};font-size:0;line-height:0">&nbsp;</td>` +
        `<td style="padding:2px 0 2px 16px">${(node.content ?? []).map(renderRichNode).join('')}</td></tr></table>`
      );
    case 'horizontalRule':
      return emailDivider();
    default:
      return '';
  }
}

function plainRichNode(node: RichNode): string {
  switch (node.type) {
    case 'paragraph':
    case 'heading':
      return plainInline(node.content);
    case 'bulletList':
    case 'orderedList':
      return (node.content ?? [])
        .filter((li) => li.type === 'listItem')
        .map((li, i) => {
          const body = (li.content ?? []).map((child) => plainInline(child.content)).join(' ');
          return node.type === 'orderedList' ? `${i + 1}. ${body}` : `- ${body}`;
        })
        .join('\n');
    case 'blockquote':
      return (node.content ?? [])
        .map(plainRichNode)
        .map((l) => `> ${l}`)
        .join('\n');
    case 'horizontalRule':
      return '—';
    default:
      return '';
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Blocks
// ───────────────────────────────────────────────────────────────────────────

/** Render one block. Unknown block types render as nothing, never as text. */
function renderBlock(block: NewsletterBlock): string {
  switch (block.type) {
    case 'hero':
      return newsletterHero(block);
    case 'heading':
      return (
        `<h2 style="margin:32px 0 12px;font-family:${emailFonts.heading};font-size:22px;` +
        `line-height:30px;font-weight:600;color:${c.primaryMain};mso-line-height-rule:exactly">` +
        `${escapeHtml(block.text)}</h2>`
      );
    case 'richText':
      return (block.doc?.content ?? []).map(renderRichNode).join('');
    case 'image':
      return newsletterImage(block);
    case 'button':
      return newsletterButton(block.href, block.label);
    case 'articleCard':
      return newsletterArticleCard(block);
    case 'list':
      return emailList((block.items ?? []).map(escapeHtml), { ordered: block.ordered });
    case 'quote':
      return newsletterQuote(block);
    case 'divider':
      return emailDivider();
    case 'spacer':
      return newsletterSpacer(block.height);
    default:
      return '';
  }
}

function plainBlock(block: NewsletterBlock): string {
  switch (block.type) {
    case 'hero':
      return [
        block.eyebrow,
        block.title,
        block.subtitle,
        block.ctaHref && `${block.ctaLabel}: ${block.ctaHref}`,
      ]
        .filter(Boolean)
        .join('\n');
    case 'heading':
      return block.text;
    case 'richText':
      return (block.doc?.content ?? []).map(plainRichNode).filter(Boolean).join('\n\n');
    case 'image':
      return block.caption ? `[${block.alt}] ${block.caption}` : `[${block.alt}]`;
    case 'button':
      return `${block.label}: ${block.href}`;
    case 'articleCard':
      return [block.tag, block.title, block.excerpt, block.href].filter(Boolean).join('\n');
    case 'list':
      // Numbering is honoured here as well as in the HTML: an ordered list is
      // usually a sequence of steps, and flattening it to bullets in the text
      // part throws away the one thing that made it ordered.
      return (block.items ?? [])
        .map((item, i) => (block.ordered ? `${i + 1}. ${item}` : `- ${item}`))
        .join('\n');
    case 'quote':
      return block.attribution ? `"${block.text}" — ${block.attribution}` : `"${block.text}"`;
    case 'divider':
      return '—';
    case 'spacer':
      return '';
    default:
      return '';
  }
}

/**
 * Render a whole campaign body.
 *
 * Takes `unknown` because the value arrives straight out of a jsonb column and
 * nothing between the composer and here re-validates it. Anything that is not
 * an array, or an element that is not an object with a known `type`, is skipped
 * rather than thrown on: a malformed block should cost that block, not the
 * campaign.
 */
export function renderBlocks(blocks: unknown): { html: string; text: string } {
  const list = Array.isArray(blocks) ? (blocks as NewsletterBlock[]) : [];
  const usable = list.filter((b) => b && typeof b === 'object' && typeof b.type === 'string');
  return {
    html: usable.map(renderBlock).join(''),
    text: usable.map(plainBlock).filter(Boolean).join('\n\n'),
  };
}
