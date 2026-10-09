import { describe, expect, it } from 'vitest';
import { en } from '../../content/copy';
import { handoffReport, type HandoffInput } from '../../core/handoff';
import type { Entry } from '../../core/types';
import { reportHtml } from './html';

const NOW = new Date('2026-10-10T04:30:00.000Z');
const ENTRY = {
  id: 'e1',
  created_at: '2026-10-10T04:20:00.000Z',
  text: 'sakit <b>ulo</b> & "malabo" paningin',
  input: 'text',
  findings: [{ code: 'severe_headache', severity: 'severe', sources: ['lexicon'], confidence: 0.9 }],
  extraction: null,
  decision: { level: 'go_now', fired: [{ rule_id: 'ANC.DT.01.headache', codes: ['severe_headache'] }] },
  card_ids: [],
  models: [],
} as unknown as Entry;

const input = (over: Partial<HandoffInput> = {}): HandoffInput => ({
  patient: { name: 'Gweny', age: 22, bloodType: 'O+', heightCm: 157, weightKg: 55, status: 'pregnant', weeks: 32 },
  emergency: { name: 'Ana', relation: 'Sister', phone: '+63 917 123 4567' },
  entry: ENTRY,
  entries: [ENTRY],
  dayLogs: [{ date: '2026-10-09', flow: null, symptoms: ['headache'], moods: ['anxious'], activities: [] }],
  periods: [],
  now: NOW,
  ...over,
});

describe('reportHtml', () => {
  it('escapes her own words', () => {
    const html = reportHtml(handoffReport(input()));
    expect(html).toContain('sakit &lt;b&gt;ulo&lt;/b&gt; &amp; &quot;malabo&quot; paningin');
    expect(html).not.toContain('<b>ulo</b>');
  });

  it('has every section in order, with copy and no external resources', () => {
    const entry = {
      ...ENTRY,
      findings: [
        { code: 'severe_headache', severity: 'severe', sources: ['lexicon'], confidence: 0.9 },
        { code: 'headache', severity: 'unknown', sources: ['llm'], confidence: 0.7 },
        { code: 'visual_disturbance', severity: 'unknown', sources: ['llm'], confidence: 0.5 },
      ],
    } as unknown as Entry;
    const html = reportHtml(handoffReport(input({ entry, entries: [entry] })), { bp: { systolic: 150, diastolic: 95 } });
    const at = (text: string) => {
      const i = html.indexOf(text.replace(/'/g, '&#39;'));
      expect(i, text).toBeGreaterThan(-1);
      return i;
    };
    const order = [
      at('Gweny'),
      at('157 cm'),
      at('O+'),
      at(en('handoff.weeks').replace('{n}', '32')),
      at('class="banner go_now"'),
      at(en('go.headline')),
      at(en('handoff.concern')),
      at('sakit &lt;b&gt;ulo'),
      at(en('handoff.signs')),
      at(en('handoff.rules')),
      at(en('handoff.recent')),
      at(en('handoff.emergency')),
      at('+63 917 123 4567'),
      at(en('handoff.private')),
      at(en('handoff.footer')),
    ];
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(html.match(/<b>Headache<\/b>/g)).toHaveLength(1);
    const safe = (t: string) => t.replace(/'/g, '&#39;');
    expect(html).toContain(safe(`${en('handoff.sev.severe')} · ${en('handoff.origin.words')} + ${en('handoff.origin.model')}`));
    expect(html).toContain(safe(`${en('handoff.sev.unknown')} · ${en('handoff.origin.model')}`));
    expect(html).toContain('150/95');
    expect(html).toContain('ANC.DT.01');
    expect(html).toContain('WHO antenatal care recommendations');
    expect(html).toContain(en('handoff.nothing_logged'));
    expect(html).toContain('size: A4');
    expect(html).not.toMatch(/https?:\/\/|<script|<link|<img|src=/i);
  });

  it('escapes every piece of her data, not only the quote', () => {
    const evil = '<script>x</script>';
    const html = reportHtml(
      handoffReport(input({ patient: { name: evil, bloodType: 'O+', status: 'pregnant', weeks: 3 }, emergency: { name: evil, relation: evil, phone: '"1234567"' } })),
    );
    expect(html).not.toContain('<script>x');
    expect(html.match(/&lt;script&gt;x&lt;\/script&gt;/g)?.length).toBeGreaterThanOrEqual(3);
    expect(html).toContain('&quot;1234567&quot;');
  });

  it('leaves out sections and rows that have no data', () => {
    const html = reportHtml(handoffReport(input({ patient: {}, emergency: undefined, entry: null, entries: [], dayLogs: [] })));
    expect(html).not.toContain(en('handoff.concern'));
    expect(html).not.toContain(en('handoff.rules'));
    expect(html).not.toContain('class="banner');
    expect(html).not.toContain(en('handoff.emergency'));
    expect(html).not.toContain(en('nurse.bp'));
    expect(html).toContain(en('handoff.recent.none'));
    expect(html).toContain(en('handoff.status.unknown'));
  });

  it('names the blood pressure rule in plain words with its citation', () => {
    const entry = { ...ENTRY, decision: { level: 'go_now', fired: [{ rule_id: 'ANC.DT.17', codes: [] }] } } as unknown as Entry;
    const html = reportHtml(handoffReport(input({ entry, entries: [entry] })));
    expect(html).toContain(en('handoff.rule.ANC.DT.17'));
    expect(html).toContain('ANC.DT.17');
  });
});
