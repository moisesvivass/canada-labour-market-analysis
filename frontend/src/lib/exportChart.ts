import { Chart } from 'chart.js';
import type { ChartTheme } from '@/lib/theme';

const SITE = 'canada-labour-market-analysis.vercel.app';

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** The chart's own labels and datasets as CSV, with the attribution as a final comment line. */
export function chartToCsv(canvas: HTMLCanvasElement, attribution: string): string | null {
  const chart = Chart.getChart(canvas);
  if (!chart) return null;
  const labels = (chart.data.labels ?? []) as unknown[];
  const datasets = chart.data.datasets.filter((_, i) => chart.isDatasetVisible(i));
  const header = ['label', ...datasets.map((d) => d.label ?? '')];
  const rows = labels.map((label, i) => [label, ...datasets.map((d) => (d.data as unknown[])[i])]);
  return [header, ...rows, [], [`# ${attribution}`]].map((row) => row.map(csvCell).join(',')).join('\n');
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  return line ? [...lines, line] : lines;
}

interface ShareImage {
  canvas: HTMLCanvasElement;
  title: string;
  finding: string | null;
  attribution: string;
  theme: ChartTheme;
}

/** A 1200x675 (16:9) PNG for social posts: title, finding, chart and attribution baked in. */
export function chartToShareImage({ canvas, title, finding, attribution, theme }: ShareImage): Promise<Blob | null> {
  const W = 1200, H = 675, PAD = 56;
  const out = document.createElement('canvas');
  out.width = W;
  out.height = H;
  const ctx = out.getContext('2d');
  if (!ctx) return Promise.resolve(null);

  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = theme.ink;
  ctx.font = "600 40px 'Source Serif 4', Georgia, serif";
  let y = PAD + 36;
  for (const line of wrap(ctx, title, W - PAD * 2)) {
    ctx.fillText(line, PAD, y);
    y += 46;
  }

  if (finding) {
    ctx.fillStyle = theme.muted;
    ctx.font = "400 22px 'Inter Variable', system-ui, sans-serif";
    for (const line of wrap(ctx, finding, W - PAD * 2).slice(0, 2)) {
      ctx.fillText(line, PAD, y);
      y += 30;
    }
  }

  ctx.font = "400 15px 'Inter Variable', system-ui, sans-serif";
  const footer = wrap(ctx, attribution, W - PAD * 2 - 280);
  const footerTop = H - PAD - footer.length * 20 + 6;

  // Fit the chart into the space between the text and the footer, keeping its aspect ratio.
  const boxTop = y + 12;
  const boxH = footerTop - boxTop - 20;
  const scale = Math.min((W - PAD * 2) / canvas.width, boxH / canvas.height);
  ctx.drawImage(canvas, PAD, boxTop, canvas.width * scale, canvas.height * scale);

  ctx.fillStyle = theme.subtle;
  footer.forEach((line, i) => ctx.fillText(line, PAD, footerTop + i * 20));
  ctx.textAlign = 'right';
  ctx.fillStyle = theme.accent;
  ctx.font = "600 15px 'Inter Variable', system-ui, sans-serif";
  ctx.fillText(SITE, W - PAD, H - PAD + 6);

  return new Promise((resolve) => out.toBlob(resolve, 'image/png'));
}
