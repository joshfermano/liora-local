import { useState, type ReactNode } from 'react';
import { Linking, View } from 'react-native';
import { en } from '../../content/copy';
import type { HandoffReport } from '../../core/handoff';
import { dialable } from '../../store/profile';
import { CapsuleButton } from '../CapsuleButton';
import { tap } from '../haptics';
import { InlineError } from '../InlineError';
import { EDGE, SEPARATOR, SURFACE } from '../theme';
import { Text } from '../Text';
import { reportModel, type DayRow, type Level, type ReportExtras, type ReportModel } from './model';
import { shareReport } from './share';

const BANNER: Record<Level, { surface: string; tag: 'onUrgent' | 'tintSoftInk' | 'secondary'; text: 'onUrgent' | 'tintSoftInk' | 'label' }> = {
  go_now: { surface: SURFACE.alarm, tag: 'onUrgent', text: 'onUrgent' },
  follow_up: { surface: SURFACE.tintSoft, tag: 'tintSoftInk', text: 'tintSoftInk' },
  ok: { surface: SURFACE.fill, tag: 'secondary', text: 'label' },
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-xs">
      <Text variant="headline" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

function Pane({ children }: { children: ReactNode }) {
  return <View className={`${SURFACE.surface} ${EDGE} gap-sm rounded-pane p-md`}>{children}</View>;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between gap-md">
      <Text variant="footnote" tone="secondary" className="pt-0.5">
        {label}
      </Text>
      <Text variant="body" className="flex-1 text-right">
        {value}
      </Text>
    </View>
  );
}

function SmallChip({ label }: { label: string }) {
  return (
    <View className={`${SURFACE.fill} min-h-[32px] justify-center rounded-full px-sm`}>
      <Text variant="subheadline">{label}</Text>
    </View>
  );
}

function ChipRow({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <View className="gap-xxs">
      <Text variant="footnote" tone="secondary">
        {label}
      </Text>
      <View className="flex-row flex-wrap gap-xs">
        {items.map((item) => (
          <SmallChip key={item} label={item} />
        ))}
      </View>
    </View>
  );
}

function HeaderCard({ header }: { header: ReportModel['header'] }) {
  return (
    <Pane>
      <View className="flex-row items-center gap-md">
        <View className={`${SURFACE.tintSoft} h-[52px] w-[52px] items-center justify-center rounded-full`} accessibilityElementsHidden>
          <Text variant="title2" tone="tintSoftInk">
            {header.initial}
          </Text>
        </View>
        <View className="flex-1 gap-xxs">
          {header.name ? <Text variant="title2">{header.name}</Text> : null}
          <Text variant="subheadline" tone="secondary">
            {header.facts.map((f) => `${f.label} ${f.value}`).join('  ·  ')}
          </Text>
        </View>
        {header.blood ? (
          <View className={`${SURFACE.tintSoft} items-center rounded-sm px-sm py-xs`} accessible accessibilityLabel={`${header.blood.label}, ${header.blood.value}`}>
            <Text variant="caption1" tone="tintSoftInk">
              {header.blood.label}
            </Text>
            <Text variant="title1" tone="tintSoftInk">
              {header.blood.value}
            </Text>
          </View>
        ) : null}
      </View>
      <View className={`h-px ${SEPARATOR}`} />
      <Text variant="body">{header.status}</Text>
      <Text variant="footnote" tone="secondary">
        {header.made}
      </Text>
    </Pane>
  );
}

function Banner({ banner }: { banner: NonNullable<ReportModel['banner']> }) {
  const look = BANNER[banner.level];
  return (
    <View className={`${look.surface} gap-xxs rounded-pane p-md`} accessibilityRole="summary">
      <Text variant="footnote" tone={look.tag}>
        {banner.tag}
      </Text>
      <Text variant="title2" tone={look.text}>
        {banner.headline}
      </Text>
      {banner.line ? (
        <Text variant="body" tone={look.text}>
          {banner.line}
        </Text>
      ) : null}
    </View>
  );
}

function Concern({ concern }: { concern: NonNullable<ReportModel['concern']> }) {
  return (
    <Section title={concern.title}>
      <Pane>
        <Text variant="footnote" tone="secondary">
          {concern.said.label}
        </Text>
        <View className="flex-row gap-sm">
          <View className="w-0.5 rounded-full bg-tint dark:bg-tint-dark" />
          <Text variant="title3" className="flex-1">{`“${concern.quote}”`}</Text>
        </View>
        <Fact {...concern.when} />
        <Fact {...concern.how} />
        {concern.bp ? <Fact {...concern.bp} /> : null}
      </Pane>
      {concern.signs.length ? (
        <View className="gap-xs pt-xs">
          <Text variant="footnote" tone="secondary">
            {concern.signsTitle}
          </Text>
          <View className="flex-row flex-wrap gap-xs">
            {concern.signs.map((s) => (
              <View
                key={s.label}
                accessible
                accessibilityLabel={`${s.label}, ${s.severity}, ${s.origin}`}
                className={`${SURFACE.surface} ${s.urgent ? 'border-[1.5px] border-urgent dark:border-urgent-dark' : EDGE} rounded-sm px-sm py-xs`}
              >
                <Text variant="headline" tone={s.urgent ? 'urgent' : 'label'}>
                  {s.label}
                </Text>
                <Text variant="caption1" tone="secondary">
                  {`${s.severity} · ${s.origin}`}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </Section>
  );
}

function Rules({ rules }: { rules: NonNullable<ReportModel['rules']> }) {
  return (
    <Section title={rules.title}>
      <Pane>
        {rules.items.map((r, i) => (
          <View key={r.section + r.name} className="gap-xxs">
            {i > 0 ? <View className={`mb-sm h-px ${SEPARATOR}`} /> : null}
            <Text variant="headline">{r.name}</Text>
            <Text variant="footnote" tone="secondary">
              {`${r.org}, ${r.title} (${r.year})`}
            </Text>
            <Text variant="footnote" tone="secondary">{`${rules.citeSection} ${r.section}`}</Text>
          </View>
        ))}
      </Pane>
    </Section>
  );
}

function Day({ day, labels }: { day: DayRow; labels: ReportModel['recent']['labels'] }) {
  return (
    <View className="gap-xs py-sm">
      <Text variant="headline">{day.date}</Text>
      <ChipRow label={labels.flow} items={day.flow ? [day.flow] : []} />
      <ChipRow label={labels.symptoms} items={day.symptoms} />
      <ChipRow label={labels.moods} items={day.moods} />
    </View>
  );
}

function Recent({ recent }: { recent: ReportModel['recent'] }) {
  return (
    <Section title={recent.title}>
      <Pane>
        {recent.days.map((d, i) => (
          <View key={d.date}>
            {i > 0 ? <View className={`h-px ${SEPARATOR}`} /> : null}
            <Day day={d} labels={recent.labels} />
          </View>
        ))}
        {recent.quiet ? (
          <Text variant="footnote" tone="tertiary">
            {recent.quiet}
          </Text>
        ) : null}
      </Pane>
    </Section>
  );
}

function Emergency({ emergency }: { emergency: NonNullable<ReportModel['emergency']> }) {
  return (
    <Section title={emergency.title}>
      <Pane>
        <Text variant="title3">{emergency.name}</Text>
        {emergency.relation ? <Fact {...emergency.relation} /> : null}
        <Fact {...emergency.phone} />
        <CapsuleButton
          variant="tinted"
          label={emergency.callLabel}
          onPress={() => void Linking.openURL(`tel:${dialable(emergency.dial)}`).catch(() => {})}
        />
      </Pane>
    </Section>
  );
}

// Detailed report on the raised surface, system face: it is held up for a nurse, not browsed.
export function ReportView({ report, extras, onBack }: { report: HandoffReport; extras?: ReportExtras; onBack: () => void }) {
  const model = reportModel(report, extras);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const share = async () => {
    tap();
    setFailed(false);
    setBusy(true);
    try {
      await shareReport(report, extras);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="gap-lg pb-lg pt-lg">
      <View className="gap-xxs" accessibilityRole="header">
        <Text variant="title1">{model.title}</Text>
        <Text variant="body" tone="secondary">
          {model.subtitle}
        </Text>
      </View>
      <HeaderCard header={model.header} />
      {model.banner ? <Banner banner={model.banner} /> : null}
      {model.concern ? <Concern concern={model.concern} /> : null}
      {model.rules?.items.length ? <Rules rules={model.rules} /> : null}
      <Recent recent={model.recent} />
      {model.emergency ? <Emergency emergency={model.emergency} /> : null}
      <View className="gap-xxs">
        {model.footer.map((line) => (
          <Text key={line} variant="footnote" tone="secondary">
            {line}
          </Text>
        ))}
      </View>
      <View className="gap-xs">
        <CapsuleButton label={en('handoff.share')} onPress={share} loading={busy} />
        {failed ? <InlineError message={en('handoff.share.error')} /> : null}
        <CapsuleButton variant="neutral" label={en('result.back')} onPress={onBack} />
      </View>
    </View>
  );
}
