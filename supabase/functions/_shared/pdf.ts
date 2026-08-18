// A small, opinionated layout engine over pdf-lib.
//
// pdf-lib draws text at coordinates and nothing else: it has no concept of a
// cursor, a page break, a paragraph or a table. Every function that wants a
// readable PDF therefore re-implements the same four things, and the fourth
// (page breaks) is the one that silently produces documents with text written
// past the bottom edge. This owns those four things once, so a caller composes
// a document out of sections and never touches a y coordinate.
//
// WHY pdf-lib AND NOT pdfkit — pdfkit reaches for `Deno.readFileSync` to load
// its built-in AFM metrics, which the Edge Runtime blocklists; the failure is a
// PermissionDenied at call time, not at deploy time. pdf-lib is pure ESM with
// the standard-font metrics compiled in, so it runs unmodified on the isolate.
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
  type RGB,
} from 'https://esm.sh/pdf-lib@1.17.1';

// A4 portrait, in PDF points.
const PAGE = { width: 595.28, height: 841.89 };
const MARGIN = { top: 60, right: 48, bottom: 56, left: 48 };
const CONTENT_WIDTH = PAGE.width - MARGIN.left - MARGIN.right;

// The brand, matching `packages/ui/src/theme/tokens.ts`. Kept as literals
// because Edge Functions cannot import from the workspace's TS packages.
const INK = rgb(0.106, 0.114, 0.129); // near-black body text
const MUTED = rgb(0.42, 0.44, 0.47);
const TEAL = rgb(0.027, 0.314, 0.302); // primary #07504D
const GOLD = rgb(0.784, 0.592, 0.227); // secondary #c8973a
const HAIRLINE = rgb(0.87, 0.88, 0.89);
const ZEBRA = rgb(0.973, 0.976, 0.98);

const BODY_SIZE = 9.5;
const LINE_HEIGHT = 13;

/**
 * Coerce text into what the standard fonts can actually encode.
 *
 * pdf-lib's built-in fonts are WinAnsi, and asking one to draw a character
 * outside that set throws rather than substituting — so a single emoji in a
 * message body, or a name in a non-Latin script, would fail the whole export
 * rather than one line of it. Smart punctuation is mapped to its ASCII
 * equivalent, accented Latin is decomposed and kept, and anything still out of
 * range becomes '?'. Lossy by construction; a lossless alternative means
 * shipping and embedding a Unicode TTF, which is a far larger change than the
 * handful of characters it would rescue.
 */
export function toWinAnsi(input: string): string {
  const mapped = input
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[\u00a0\u2007\u202f]/g, ' ')
    .replace(/[•·]/g, '-')
    .replace(/\r\n?/g, '\n')
    .replace(/\t/g, '  ');

  let out = '';
  for (const ch of mapped) {
    const code = ch.codePointAt(0)!;
    if (ch === '\n' || (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff)) {
      out += ch;
      continue;
    }
    const folded = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const foldedCode = folded.codePointAt(0);
    out +=
      folded.length === 1 && foldedCode !== undefined && foldedCode >= 0x20 && foldedCode <= 0x7e
        ? folded
        : '?';
  }
  return out;
}

/**
 * Break text into lines that fit `maxWidth`, honouring existing newlines.
 *
 * The inner loop handles the case that makes naive wrappers overflow: a single
 * "word" wider than the whole column — a URL, a reference number, an unbroken
 * paste — which has to be cut mid-token because no amount of word wrapping will
 * ever make it fit.
 */
function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];

  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }

    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);

      if (font.widthOfTextAtSize(word, size) <= maxWidth) {
        line = word;
        continue;
      }
      let chunk = '';
      for (const ch of word) {
        if (chunk && font.widthOfTextAtSize(chunk + ch, size) > maxWidth) {
          lines.push(chunk);
          chunk = ch;
        } else {
          chunk += ch;
        }
      }
      line = chunk;
    }
    if (line) lines.push(line);
  }

  return lines;
}

export type TableColumn = {
  header: string;
  /** Share of the content width, as a proportion of the sum of all weights. */
  weight: number;
  align?: 'left' | 'right';
};

export type PdfMetaEntry = { label: string; value: string };

/**
 * A flowing, paginated document.
 *
 * The cursor (`y`) only ever moves down, and every write goes through `ensure`,
 * which starts a new page when the requested block will not fit. That is the
 * whole trick: no caller can produce a page with content written below the
 * bottom margin, because no caller positions anything itself.
 */
export class PdfBuilder {
  private constructor(
    private readonly doc: PDFDocument,
    private readonly regular: PDFFont,
    private readonly bold: PDFFont,
    private readonly documentTitle: string,
  ) {}

  private pages: PDFPage[] = [];
  private page!: PDFPage;
  private y = 0;

  static async create(documentTitle: string): Promise<PdfBuilder> {
    const doc = await PDFDocument.create();
    const builder = new PdfBuilder(
      doc,
      await doc.embedFont(StandardFonts.Helvetica),
      await doc.embedFont(StandardFonts.HelveticaBold),
      toWinAnsi(documentTitle),
    );
    builder.newPage();
    return builder;
  }

  private newPage(): void {
    this.page = this.doc.addPage([PAGE.width, PAGE.height]);
    this.pages.push(this.page);
    this.y = PAGE.height - MARGIN.top;
  }

  /** Reserve vertical space, starting a page if this block will not fit. */
  private ensure(height: number): void {
    if (this.y - height < MARGIN.bottom) this.newPage();
  }

  private draw(text: string, x: number, size: number, font: PDFFont, color: RGB): void {
    this.page.drawText(text, { x, y: this.y, size, font, color });
  }

  /** Vertical whitespace, in points. */
  gap(height = 10): void {
    this.y -= height;
  }

  /**
   * The opening page: brand band, document title, and the metadata that says
   * what this file is and who it belongs to.
   */
  cover(opts: { title: string; subtitle: string; meta: PdfMetaEntry[] }): void {
    const bandHeight = 132;
    this.page.drawRectangle({
      x: 0,
      y: PAGE.height - bandHeight,
      width: PAGE.width,
      height: bandHeight,
      color: TEAL,
    });
    this.page.drawRectangle({
      x: 0,
      y: PAGE.height - bandHeight - 4,
      width: PAGE.width,
      height: 4,
      color: GOLD,
    });

    this.page.drawText(toWinAnsi('SINNAPI'), {
      x: MARGIN.left,
      y: PAGE.height - 52,
      size: 11,
      font: this.bold,
      color: GOLD,
    });
    this.page.drawText(toWinAnsi(opts.title), {
      x: MARGIN.left,
      y: PAGE.height - 84,
      size: 22,
      font: this.bold,
      color: rgb(1, 1, 1),
    });
    this.page.drawText(toWinAnsi(opts.subtitle), {
      x: MARGIN.left,
      y: PAGE.height - 104,
      size: 10,
      font: this.regular,
      color: rgb(0.85, 0.89, 0.88),
    });

    this.y = PAGE.height - bandHeight - 40;
    this.keyValues(opts.meta);
    this.gap(6);
  }

  /** A numbered-looking section heading with a gold rule under it. */
  section(title: string): void {
    this.ensure(60);
    this.gap(24);
    this.draw(toWinAnsi(title), MARGIN.left, 13, this.bold, TEAL);
    this.y -= 8;
    this.page.drawRectangle({
      x: MARGIN.left,
      y: this.y,
      width: 34,
      height: 2.5,
      color: GOLD,
    });
    this.y -= 14;
  }

  paragraph(text: string, color: RGB = INK): void {
    const lines = wrap(toWinAnsi(text), this.regular, BODY_SIZE, CONTENT_WIDTH);
    for (const line of lines) {
      this.ensure(LINE_HEIGHT);
      this.y -= LINE_HEIGHT;
      this.draw(line, MARGIN.left, BODY_SIZE, this.regular, color);
    }
    this.gap(4);
  }

  /** A caveat or aside — same measure as a paragraph, in the muted grey. */
  note(text: string): void {
    this.paragraph(text, MUTED);
  }

  /** What a section says when the user simply has none of that kind of record. */
  empty(text: string): void {
    this.ensure(LINE_HEIGHT);
    this.y -= LINE_HEIGHT;
    this.draw(toWinAnsi(text), MARGIN.left, BODY_SIZE, this.regular, MUTED);
    this.gap(4);
  }

  /**
   * Label/value pairs in two columns, with the value wrapping under itself.
   * The shape every "details" block in the export takes.
   */
  keyValues(rows: PdfMetaEntry[]): void {
    const labelWidth = 150;
    const valueWidth = CONTENT_WIDTH - labelWidth;

    for (const { label, value } of rows) {
      const lines = wrap(toWinAnsi(value || '-'), this.regular, BODY_SIZE, valueWidth);
      const height = Math.max(lines.length, 1) * LINE_HEIGHT;
      this.ensure(height + 2);

      const top = this.y;
      this.y -= LINE_HEIGHT;
      this.draw(toWinAnsi(label), MARGIN.left, BODY_SIZE, this.bold, MUTED);

      this.page.drawText(lines[0] ?? '-', {
        x: MARGIN.left + labelWidth,
        y: this.y,
        size: BODY_SIZE,
        font: this.regular,
        color: INK,
      });
      for (let i = 1; i < lines.length; i += 1) {
        this.y -= LINE_HEIGHT;
        this.page.drawText(lines[i], {
          x: MARGIN.left + labelWidth,
          y: this.y,
          size: BODY_SIZE,
          font: this.regular,
          color: INK,
        });
      }

      this.y = top - height - 2;
    }
  }

  /**
   * A zebra-striped table with wrapping cells.
   *
   * The header repeats on every page it spills onto — a continuation page of
   * bare figures with no column names is unreadable, and this is the one detail
   * hand-rolled table code always omits.
   */
  table(columns: TableColumn[], rows: string[][]): void {
    if (rows.length === 0) {
      this.empty('No records.');
      return;
    }

    const totalWeight = columns.reduce((sum, c) => sum + c.weight, 0);
    const widths = columns.map((c) => (c.weight / totalWeight) * CONTENT_WIDTH);
    const padding = 6;

    const drawHeader = () => {
      this.ensure(24);
      this.y -= 18;
      let x = MARGIN.left;
      columns.forEach((column, i) => {
        this.page.drawText(toWinAnsi(column.header).toUpperCase(), {
          // Same padding as the cells below, so a column header sits directly
          // over its own values rather than 6pt to the left of them.
          x:
            column.align === 'right'
              ? x + widths[i] - padding - this.headerWidth(column)
              : x + padding,
          y: this.y,
          size: 7.5,
          font: this.bold,
          color: MUTED,
        });
        x += widths[i];
      });
      this.y -= 6;
      this.page.drawRectangle({
        x: MARGIN.left,
        y: this.y,
        width: CONTENT_WIDTH,
        height: 0.8,
        color: HAIRLINE,
      });
    };

    drawHeader();

    rows.forEach((row, rowIndex) => {
      const cells = row.map((cell, i) =>
        wrap(toWinAnsi(cell || '-'), this.regular, BODY_SIZE, widths[i] - padding * 2),
      );
      const height = Math.max(...cells.map((c) => c.length), 1) * LINE_HEIGHT + padding;

      if (this.y - height < MARGIN.bottom) {
        this.newPage();
        drawHeader();
      }

      const top = this.y;
      if (rowIndex % 2 === 1) {
        this.page.drawRectangle({
          x: MARGIN.left,
          y: top - height,
          width: CONTENT_WIDTH,
          height,
          color: ZEBRA,
        });
      }

      let x = MARGIN.left;
      cells.forEach((lines, i) => {
        lines.forEach((line, lineIndex) => {
          const width = this.regular.widthOfTextAtSize(line, BODY_SIZE);
          this.page.drawText(line, {
            x: columns[i].align === 'right' ? x + widths[i] - padding - width : x + padding,
            y: top - padding - (lineIndex + 1) * LINE_HEIGHT + 4,
            size: BODY_SIZE,
            font: this.regular,
            color: INK,
          });
        });
        x += widths[i];
      });

      this.y = top - height;
    });

    this.gap(6);
  }

  private headerWidth(column: TableColumn): number {
    return this.bold.widthOfTextAtSize(toWinAnsi(column.header).toUpperCase(), 7.5);
  }

  /**
   * Stamp footers and serialise.
   *
   * Footers are written last because "Page 3 of 11" cannot be known until the
   * document has stopped growing — writing them as each page opened would mean
   * knowing the total before the content that decides it exists.
   */
  async finish(footerNote: string): Promise<Uint8Array> {
    const total = this.pages.length;
    const note = toWinAnsi(footerNote);

    this.pages.forEach((page, index) => {
      page.drawRectangle({
        x: MARGIN.left,
        y: MARGIN.bottom - 14,
        width: CONTENT_WIDTH,
        height: 0.8,
        color: HAIRLINE,
      });
      page.drawText(note, {
        x: MARGIN.left,
        y: MARGIN.bottom - 26,
        size: 7.5,
        font: this.regular,
        color: MUTED,
      });
      const label = `Page ${index + 1} of ${total}`;
      page.drawText(label, {
        x: PAGE.width - MARGIN.right - this.regular.widthOfTextAtSize(label, 7.5),
        y: MARGIN.bottom - 26,
        size: 7.5,
        font: this.regular,
        color: MUTED,
      });
    });

    this.doc.setTitle(this.documentTitle);
    this.doc.setProducer('Sinnapi');
    this.doc.setCreator('Sinnapi');
    return await this.doc.save();
  }
}
