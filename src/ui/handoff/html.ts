import type { HandoffReport } from '../../core/handoff';
import { reportModel, type DayRow, type ReportExtras, type ReportModel } from './model';

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (text: string) => text.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);

const CSS = `
@page { size: A4; margin: 14mm; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font-family: -apple-system, system-ui, sans-serif; color: #241A21; font-size: 13px; line-height: 1.45; margin: 0; }
h1 { font-size: 22px; margin: 0; }
h2 { font-size: 14px; margin: 18px 0 6px; padding-bottom: 3px; border-bottom: 1px solid #999; }
p { margin: 0 0 4px; }
.sub { color: #675663; margin-bottom: 10px; }
.card { border: 1px solid #D9CAD4; border-radius: 10px; padding: 12px; margin-bottom: 10px; page-break-inside: avoid; }
.head { display: table; width: 100%; }
.head > div { display: table-cell; vertical-align: middle; }
.avatar { width: 46px; height: 46px; border-radius: 23px; background: #FBE4EE; color: #A11E4E; font-size: 22px; font-weight: 700; text-align: center; line-height: 46px; }
.name { font-size: 20px; font-weight: 700; }
.muted { color: #675663; font-size: 12px; }
.blood { text-align: right; width: 90px; }
.blood b { display: block; font-size: 26px; color: #A11E4E; line-height: 1.1; }
.facts span { margin-right: 14px; }
.facts b { font-weight: 600; }
.banner { border-radius: 10px; padding: 12px; margin-bottom: 10px; page-break-inside: avoid; }
.banner.go_now { background: #C8102E; color: #fff; }
.banner.follow_up { background: #FBE4EE; color: #A11E4E; }
.banner.ok { background: #EEE5EC; color: #241A21; }
.banner .tag { font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; }
.banner .hl { font-size: 17px; font-weight: 700; }
table { border-collapse: collapse; width: 100%; }
td { padding: 3px 0; vertical-align: top; }
td.k { width: 22%; color: #675663; padding-right: 8px; }
blockquote { margin: 6px 0; padding-left: 10px; border-left: 3px solid #C2255C; font-size: 15px; }
.chip { display: inline-block; border: 1px solid #D9CAD4; border-radius: 8px; padding: 3px 9px; margin: 0 6px 6px 0; background: #FEFBFD; }
.chip b { display: block; font-weight: 600; }
.chip i { display: block; font-style: normal; color: #675663; font-size: 11px; }
.chip.urgent { border-color: #C8102E; }
.chip.urgent b { color: #C8102E; }
.chip.small { border-radius: 999px; padding: 2px 10px; margin-bottom: 3px; }
.rule { margin-bottom: 8px; page-break-inside: avoid; }
.rule b { display: block; }
.day { padding: 6px 0; border-top: 1px solid #E4D7E0; page-break-inside: avoid; }
.day:first-of-type { border-top: 0; }
.day .d { font-weight: 600; }
.quiet { color: #675663; font-size: 12px; margin-top: 6px; }
.foot { margin-top: 18px; padding-top: 8px; border-top: 1px solid #999; color: #675663; font-size: 11px; }
`;

const chips = (items: string[]) => items.map((t) => `<span class="chip small">${esc(t)}</span>`).join('');
const pair = (k: string, v: string) => `<tr><td class="k">${esc(k)}</td><td>${esc(v)}</td></tr>`;

function header(m: ReportModel): string {
  const h = m.header;
  const facts = h.facts.map((f) => `<span>${esc(f.label)} <b>${esc(f.value)}</b></span>`).join('');
  const blood = h.blood ? `<div class="blood"><span class="muted">${esc(h.blood.label)}</span><b>${esc(h.blood.value)}</b></div>` : '';
  return `<div class="card"><div class="head"><div style="width:56px"><div class="avatar">${esc(h.initial)}</div></div><div>${
    h.name ? `<div class="name">${esc(h.name)}</div>` : ''
  }<div class="facts muted">${facts}</div></div>${blood}</div><p>${esc(h.status)}</p><p class="muted">${esc(h.made)}</p></div>`;
}

function banner(m: ReportModel): string {
  const b = m.banner;
  if (!b) return '';
  return `<div class="banner ${b.level}"><div class="tag">${esc(b.tag)}</div><div class="hl">${esc(b.headline)}</div>${b.line ? `<div>${esc(b.line)}</div>` : ''}</div>`;
}

function concern(m: ReportModel): string {
  const c = m.concern;
  if (!c) return '';
  const signs = c.signs
    .map((s) => `<span class="chip${s.urgent ? ' urgent' : ''}"><b>${esc(s.label)}</b><i>${esc(`${s.severity} · ${s.origin}`)}</i></span>`)
    .join('');
  return `<h2>${esc(c.title)}</h2><p class="muted">${esc(c.said.label)}</p><blockquote>“${esc(c.quote)}”</blockquote><table>${pair(c.when.label, c.when.value)}${pair(c.how.label, c.how.value)}${
    c.bp ? pair(c.bp.label, c.bp.value) : ''
  }</table>${c.signs.length ? `<h2>${esc(c.signsTitle)}</h2>${signs}` : ''}`;
}

function rules(m: ReportModel): string {
  if (!m.rules?.items.length) return '';
  const items = m.rules.items
    .map(
      (r) =>
        `<div class="rule"><b>${esc(r.name)}</b><span class="muted">${esc(`${r.org}, ${r.title} (${r.year}). ${m.rules!.citeSection} ${r.section}`)}</span></div>`,
    )
    .join('');
  return `<h2>${esc(m.rules.title)}</h2>${items}`;
}

function day(d: DayRow, labels: ReportModel['recent']['labels']): string {
  const line = (k: string, items: string[]) => (items.length ? `<tr><td class="k">${esc(k)}</td><td>${chips(items)}</td></tr>` : '');
  return `<div class="day"><div class="d">${esc(d.date)}</div><table>${line(labels.flow, d.flow ? [d.flow] : [])}${line(labels.symptoms, d.symptoms)}${line(labels.moods, d.moods)}</table></div>`;
}

function emergency(m: ReportModel): string {
  const e = m.emergency;
  if (!e) return '';
  return `<h2>${esc(e.title)}</h2><div class="card"><div class="name">${esc(e.name)}</div><table>${e.relation ? pair(e.relation.label, e.relation.value) : ''}${pair(e.phone.label, e.phone.value)}</table></div>`;
}

// Inline CSS and system fonts only: it is printed on the phone and nothing is fetched.
export function reportHtml(report: HandoffReport, extras: ReportExtras = {}): string {
  const m = reportModel(report, extras);
  const recent = `<h2>${esc(m.recent.title)}</h2>${m.recent.days.map((d) => day(d, m.recent.labels)).join('')}${
    m.recent.quiet ? `<p class="quiet">${esc(m.recent.quiet)}</p>` : ''
  }`;
  const body = `${header(m)}${banner(m)}${concern(m)}${rules(m)}${recent}${emergency(m)}<div class="foot">${m.footer.map((f) => `<p>${esc(f)}</p>`).join('')}</div>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(m.title)}</title><style>${CSS}</style></head><body><h1>${esc(m.title)}</h1><p class="sub">${esc(m.subtitle)}</p>${body}</body></html>`;
}
