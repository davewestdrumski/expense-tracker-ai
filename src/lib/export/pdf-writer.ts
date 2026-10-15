/**
 * Minimal, dependency-free PDF 1.4 writer: text in the standard Helvetica fonts,
 * filled/stroked rectangles, and lines. Coordinates are top-left based (points).
 */

export type PdfFont = "regular" | "bold";

// Standard Helvetica / Helvetica-Bold advance widths (1/1000 em) for ASCII 32–126.
// prettier-ignore
const WIDTHS: Record<PdfFont, number[]> = {
  regular: [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584],
  bold: [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584],
};

// Unicode → WinAnsiEncoding for the typographic characters we actually use.
const WIN_ANSI: Record<number, number> = {
  0x20ac: 0x80, 0x2026: 0x85, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93,
  0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
};
const WIN_ANSI_WIDTH: Record<number, number> = {
  0x80: 556, 0x85: 1000, 0x91: 222, 0x92: 222, 0x93: 333, 0x94: 333, 0x95: 350, 0x96: 556, 0x97: 1000,
};

/** Converts text to single-byte WinAnsi; unsupported characters become "?". */
export function toWinAnsi(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (code >= 0x20 && code <= 0x7e) out += ch;
    else if (code >= 0xa0 && code <= 0xff) out += ch;
    else if (WIN_ANSI[code]) out += String.fromCharCode(WIN_ANSI[code]);
    else if (code < 0x20) out += " ";
    else out += "?";
  }
  return out;
}

export function textWidth(text: string, font: PdfFont, size: number): number {
  let units = 0;
  for (const ch of toWinAnsi(text)) {
    const code = ch.charCodeAt(0);
    units += code >= 32 && code <= 126 ? WIDTHS[font][code - 32] : WIN_ANSI_WIDTH[code] ?? 556;
  }
  return (units / 1000) * size;
}

/** Truncates with an ellipsis so the text fits within maxWidth. */
export function fitText(text: string, font: PdfFont, size: number, maxWidth: number): string {
  if (textWidth(text, font, size) <= maxWidth) return text;
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (textWidth(text.slice(0, mid) + "…", font, size) <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return text.slice(0, lo).trimEnd() + "…";
}

function rgb(hex: string): string {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => (v / 255).toFixed(3)).join(" ");
}

const num = (v: number) => (Math.round(v * 100) / 100).toString();

function escapeString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export interface TextStyle {
  font?: PdfFont;
  size?: number;
  color?: string;
  align?: "left" | "right" | "center";
}

export class PdfPage {
  readonly ops: string[] = [];
  constructor(readonly width: number, readonly height: number) {}

  text(x: number, y: number, value: string, { font = "regular", size = 10, color = "#0f172a", align = "left" }: TextStyle = {}) {
    const w = textWidth(value, font, size);
    const left = align === "right" ? x - w : align === "center" ? x - w / 2 : x;
    // y is the top of the line box; place the baseline ~80% down the font size.
    const baseline = this.height - (y + size * 0.8);
    this.ops.push(
      `BT /${font === "bold" ? "F2" : "F1"} ${num(size)} Tf ${rgb(color)} rg ${num(left)} ${num(baseline)} Td (${escapeString(toWinAnsi(value))}) Tj ET`,
    );
  }

  rect(x: number, y: number, w: number, h: number, { fill, stroke, lineWidth = 0.5 }: { fill?: string; stroke?: string; lineWidth?: number }) {
    const box = `${num(x)} ${num(this.height - y - h)} ${num(w)} ${num(h)} re`;
    if (fill && stroke) this.ops.push(`${rgb(fill)} rg ${rgb(stroke)} RG ${num(lineWidth)} w ${box} B`);
    else if (fill) this.ops.push(`${rgb(fill)} rg ${box} f`);
    else if (stroke) this.ops.push(`${rgb(stroke)} RG ${num(lineWidth)} w ${box} S`);
  }

  line(x1: number, y1: number, x2: number, y2: number, { color = "#e2e8f0", width = 0.5 } = {}) {
    this.ops.push(`${rgb(color)} RG ${num(width)} w ${num(x1)} ${num(this.height - y1)} m ${num(x2)} ${num(this.height - y2)} l S`);
  }
}

export class PdfDocument {
  readonly pages: PdfPage[] = [];
  constructor(
    private readonly meta: { title: string; author?: string },
    readonly pageWidth = 612,
    readonly pageHeight = 792,
  ) {}

  addPage(): PdfPage {
    const page = new PdfPage(this.pageWidth, this.pageHeight);
    this.pages.push(page);
    return page;
  }

  toBytes(): Uint8Array {
    const objects: string[] = [];
    const add = (body: string) => objects.push(body); // returns new object number

    add("<< /Type /Catalog /Pages 2 0 R >>"); // 1
    add(""); // 2: Pages, filled in below
    add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"); // 3
    add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"); // 4
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const created = `D:${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    const info = add(
      `<< /Title (${escapeString(toWinAnsi(this.meta.title))}) /Producer (Spendwise) /Creator (Spendwise) ${
        this.meta.author ? `/Author (${escapeString(toWinAnsi(this.meta.author))}) ` : ""
      }/CreationDate (${created}) >>`,
    );

    const kids: number[] = [];
    for (const page of this.pages) {
      const stream = page.ops.join("\n");
      const contentId = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
      kids.push(
        add(
          `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.pageWidth} ${this.pageHeight}] ` +
            `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`,
        ),
      );
    }
    objects[1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`;

    // Every character is a single byte (WinAnsi), so string length === byte offset.
    let out = "%PDF-1.4\n%âãÏÓ\n";
    const offsets: number[] = [];
    objects.forEach((body, i) => {
      offsets.push(out.length);
      out += `${i + 1} 0 obj\n${body}\nendobj\n`;
    });
    const xref = out.length;
    out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    out += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
    out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

    const bytes = new Uint8Array(out.length);
    for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff;
    return bytes;
  }
}
