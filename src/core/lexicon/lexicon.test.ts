import { describe, expect, it } from 'vitest';
import { mergeFindings } from '../merge';
import { evaluate } from '../rules';
import type { Context, DangerCode } from '../types';
import { DANGER_CODES } from '../vocabulary';
import { readMoods, readText, readWeeks } from './index';

const ctx: Context = { status: 'pregnant', weeks: 32 };
const decide = (text: string) => evaluate(mergeFindings(readText(text)), ctx);
const sev = (text: string, code: string) =>
  mergeFindings(readText(text)).find((f) => f.code === code)?.severity;

describe('difficulty breathing (WHO ANC DAK: "Severe difficulty breathing")', () => {
  it.each(['hirap akong huminga', 'hindi ako makahinga', 'kinakapos ang hininga ko', "I can't breathe properly"])(
    'reads "%s" as difficulty breathing',
    (text) => {
      expect(readText(text).map((f) => f.code)).toContain('severe_difficulty_breathing');
    },
  );

  it('goes to go_now when the message says it is very bad', () => {
    expect(decide('sobrang hirap huminga').level).toBe('go_now');
  });

  it('asks the follow-up when the message does not say how bad', () => {
    const decision = decide('hirap akong huminga');
    expect(decision.level).toBe('follow_up');
    expect(decision.follow_up?.code).toBe('severe_difficulty_breathing');
  });
});

describe('readText', () => {
  it('marks every finding as lexicon with null confidence', () => {
    const findings = readText('masakit ulo ko');
    expect(findings.length).toBeGreaterThan(0);
    for (const f of findings) {
      expect(f.sources).toEqual(['lexicon']);
      expect(f.confidence).toBeNull();
    }
  });

  it('returns nothing for text with no known phrase', () => {
    expect(readText('kumain na ako ng lugaw')).toEqual([]);
  });

  it('goes to go_now for severe headache plus blurred vision', () => {
    const text = '32 weeks na ako, sobrang sakit ng ulo tapos malabo paningin';
    const d = decide(text);
    expect(d.level).toBe('go_now');
    const codes = d.fired.flatMap((f) => f.codes);
    expect(codes).toContain('severe_headache');
    expect(codes).toContain('visual_disturbance');
    expect(readWeeks(text)).toBe(32);
  });

  it('stays ok for a mild backache', () => {
    const merged = mergeFindings(readText('medyo masakit ang balakang ko'));
    expect(evaluate(merged, ctx).level).toBe('ok');
    expect(merged.some((f) => (DANGER_CODES as readonly string[]).includes(f.code))).toBe(false);
    expect(merged.find((f) => f.code === 'back_pain')?.severity).toBe('mild');
  });

  it('asks the follow-up when the headache has no severity cue', () => {
    const d = decide('masakit ulo ko');
    expect(d.level).toBe('follow_up');
    expect(d.follow_up?.code).toBe('severe_headache');
    expect(sev('masakit ulo ko', 'headache')).toBe('unknown');
  });

  it('reads sobrang as severe and medyo as mild for the same sign', () => {
    expect(sev('sobrang sakit ng ulo', 'severe_headache')).toBe('severe');
    expect(sev('medyo sakit ng ulo', 'severe_headache')).toBe('mild');
    expect(decide('medyo sakit ng ulo').level).toBe('ok');
    expect(decide('sobrang sakit ng ulo').level).toBe('go_now');
  });

  it.each([
    ['grabe', 'severe'], ['napaka', 'severe'], ['matindi', 'severe'], ['severe', 'severe'],
    ['really bad', 'severe'], ['konti', 'mild'], ['bahagya', 'mild'], ['slight', 'mild'],
    ['a bit', 'mild'],
  ])('cue "%s" gives %s', (cue, expected) => {
    expect(sev(`${cue} sakit ng ulo`, 'severe_headache')).toBe(expected);
  });

  it('keeps a cue inside its own clause', () => {
    const text = 'medyo masakit ang balakang, sobrang sakit ng ulo';
    expect(sev(text, 'back_pain')).toBe('mild');
    expect(sev(text, 'severe_headache')).toBe('severe');
  });

  it.each([',', '.', ' tapos ', ' at ', ' and '])('splits clauses on %j', (sep) => {
    const text = `medyo masakit ang balakang${sep}sobrang sakit ng ulo`;
    expect(sev(text, 'back_pain')).toBe('mild');
    expect(sev(text, 'severe_headache')).toBe('severe');
  });

  it('takes the more serious cue when one clause has both', () => {
    expect(sev('medyo grabe ang sakit ng ulo', 'severe_headache')).toBe('severe');
  });

  it('documents the ruling: negation is not read, so caution goes up', () => {
    expect(sev('walang sakit ng ulo', 'severe_headache')).toBe('unknown');
    expect(decide('hindi ako dinudugo').level).toBe('go_now');
  });

  it('does not treat a headache as general severe pain', () => {
    const codes = readText('sobrang sakit ng ulo').map((f) => f.code);
    expect(codes).not.toContain('severe_pain');
  });
});

describe('danger code phrasings', () => {
  const phrases: Record<DangerCode, string[]> = {
    vaginal_bleeding: ['dinudugo ako', 'may dugo sa underwear ko', 'I have bleeding', 'malakas ang dugo ko', 'nakaka-tatlong pads na ako sa isang oras', 'napupuno ang pads ko', 'soaking through my pads', 'heavy bleeding after birth', 'may buo-buong dugo', 'passing blood clots'],
    convulsions: ['nagka-seizure siya', 'may kumbulsyon', 'having a convulsion'],
    fever: ['may lagnat ako', 'nilalagnat', 'I have a fever'],
    severe_headache: ['sakit ng ulo', 'masakit ulo ko', 'headache'],
    visual_disturbance: ['malabo paningin', 'blurry vision', 'nanlalabo ang mata ko'],
    imminent_delivery: ['lumalabas na ang ulo ng baby', 'the baby is crowning'],
    labour: ['naglalabor na ako', 'pumutok ang panubigan', 'regular contractions'],
    looks_very_ill: ['hina niya', 'she looks very sick', 'hindi makatayo'],
    severe_vomiting: ['suka nang suka', 'sumusuka ako', 'vomiting all day'],
    severe_pain: ['severe pain', 'hindi ko matiis ang sakit', 'sakit na sakit ako'],
    severe_abdominal_pain: ['sakit ng tiyan', 'masakit tiyan ko', 'stomach pain'],
    unconscious: ['hinimatay siya', 'nawalan ng malay', 'she passed out'],
    central_cyanosis: ['nangingitim ang labi', 'blue lips', 'asul ang labi'],
    severe_difficulty_breathing: ['hirap huminga', 'hindi makahinga', 'shortness of breath'],
  };
  const serious = (code: string) => code.startsWith('severe_');

  // In pregnancy WHO PCPNC splits fever and feeling ill: a question or "as soon as possible", never calm.
  const split = (code: string) => code === 'fever' || code === 'looks_very_ill';
  for (const code of DANGER_CODES) {
    it.each(phrases[code])(`"%s" fires ${code}`, (phrase) => {
      const text = serious(code) ? `sobrang ${phrase}` : phrase;
      const d = decide(text);
      if (split(code)) {
        expect(['follow_up', 'go_soon']).toContain(d.level);
        expect(d.fired.flatMap((f) => f.codes).concat(d.follow_up?.code ?? [])).toContain(code);
        return;
      }
      expect(d.level).toBe('go_now');
      expect(d.fired.flatMap((f) => f.codes)).toContain(code);
    });
  }

  it.each(DANGER_CODES.filter(serious))('%s without a cue asks, and mild does not go now', (code) => {
    const phrase = phrases[code][1]!;
    expect(sev(phrase, code)).toBe('unknown');
    expect(decide(phrase).level).toBe('follow_up');
    const mild = decide(`medyo ${phrase}`);
    expect(mild.level).not.toBe('go_now');
  });

  it('covers every danger code', () => {
    expect(Object.keys(phrases).sort()).toEqual([...DANGER_CODES].sort());
  });
});

describe('symptom phrasings', () => {
  it.each([
    ['sakit ng ulo', 'headache'], ['headache ako', 'headache'],
    ['masakit ang balakang', 'back_pain'], ['masakit ang likod', 'back_pain'],
    ['nasusuka ako', 'nausea'], ['masakit ang puson', 'pelvic_pain'],
    ['may cramps', 'cramps'], ['bloated ako', 'bloating'], ['pagod na pagod', 'fatigue'],
    ['mood swings', 'mood_changes'], ['may tigyawat', 'acne'],
    ['masakit ang suso ko', 'breast_tenderness'], ['hindi makatulog', 'sleep_quality'],
    ['walang energy', 'energy'], ['sobrang stress', 'stress'],
    ['walang gana kumain', 'appetite'],
  ])('"%s" gives %s', (text, code) => {
    expect(readText(text).map((f) => f.code)).toContain(code);
  });

  it('makes a head pain a headache symptom plus the severe_headache danger code', () => {
    const codes = readText('masakit ulo').map((f) => f.code);
    expect(codes).toEqual(expect.arrayContaining(['severe_headache', 'headache']));
  });

  it('does not read a backache as abdominal pain', () => {
    expect(readText('masakit ang likod').map((f) => f.code)).not.toContain('severe_abdominal_pain');
  });
});

describe('readMoods', () => {
  it.each([
    ['masaya ako', 'joyful'], ['kalmado', 'calm'], ['pagod ako', 'tired'],
    ['kinakabahan ako', 'anxious'], ['I feel sad', 'sad'], ['naiirita ako', 'irritable'],
  ])('"%s" gives %s', (text, mood) => {
    expect(readMoods(text)).toContain(mood);
  });

  it('returns nothing for neutral text', () => {
    expect(readMoods('kumain na ako')).toEqual([]);
  });
});

describe('readWeeks', () => {
  it.each([
    ['32 weeks na ako', 32], ['32 linggo', 32], ['I am 28 weeks pregnant', 28], ['8 wks', 8],
  ])('reads "%s"', (text, weeks) => {
    expect(readWeeks(text)).toBe(weeks);
  });

  it.each(['masakit ulo ko', '3 days na', '120 weeks', '0 weeks'])('gives null for "%s"', (t) => {
    expect(readWeeks(t)).toBeNull();
  });
});
