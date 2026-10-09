import type { HandoffReport } from '../../core/handoff';
import { reportModel, type Line, type ReportExtras } from './model';

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (text: string) => text.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);

const CSS = `
@page { margin: 18mm; }
body { font-family: -apple-system, system-ui, sans-serif; color: #111; font-size: 14px; line-height: 1.45; margin: 0; }
h1 { font-size: 26px; margin: 0 0 2px; }
h2 { font-size: 16px; margin: 22px 0 6px; padding-bottom: 4px; border-bottom: 1px solid #999; }
h3 { font-size: 13px; margin: 12px 0 2px; color: #444; }
p { margin: 0 0 4px; }
.sub { color: #444; }
.made { color: #444; font-size: 12px; margin-top: 4px; }
table { border-collapse: collapse; width: 100%; }
td { padding: 3px 0; vertical-align: top; }
td.k { width: 36%; color: #444; padding-right: 10px; }
blockquote { margin: 0 0 6px; padding-left: 10px; border-left: 3px solid #999; }
.urgent { color: #B00020; font-weight: 700; }
.note { color: #444; font-size: 12px; }
.foot { margin-top: 28px; padding-top: 8px; border-top: 1px solid #999; color: #444; font-size: 12px; }
`;

function section(lines: Line[]): string {
  let out = '';
  let rows = '';
  const flush = () => {
    if (rows) out += `<table>${rows}</table>`;
    rows = '';
  };
  for (const l of lines) {
    if (l.kind === 'row') {
      rows += `<tr><td class="k">${esc(l.label)}</td><td${l.urgent ? ' class="urgent"' : ''}>${esc(l.value)}</td></tr>`;
      continue;
    }
    flush();
    if (l.kind === 'heading') out += `<h3>${esc(l.text)}</h3>`;
    else if (l.kind === 'quote') out += `<blockquote>“${esc(l.text)}”</blockquote>`;
    else if (l.kind === 'note') out += `<p class="note">${esc(l.text)}</p>`;
    else out += `<p${l.urgent ? ' class="urgent"' : ''}>${esc(l.text)}</p>`;
  }
  flush();
  return out;
}

// Inline CSS and system fonts only: it is printed on the phone and nothing is fetched.
export function reportHtml(report: HandoffReport, extras: ReportExtras = {}): string {
  const m = reportModel(report, extras);
  const body = m.sections.map((s) => `<h2>${esc(s.title)}</h2>${section(s.lines)}`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(m.title)}</title><style>${CSS}</style></head><body><h1>${esc(m.title)}</h1><p class="sub">${esc(m.subtitle)}</p><p class="made">${esc(m.made)}</p>${body}<p class="foot">${esc(m.footer)}</p></body></html>`;
}
