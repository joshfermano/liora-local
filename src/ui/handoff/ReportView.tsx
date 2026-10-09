import { useState } from 'react';
import { View } from 'react-native';
import { en } from '../../content/copy';
import type { HandoffReport } from '../../core/handoff';
import { CapsuleButton } from '../CapsuleButton';
import { tap } from '../haptics';
import { InlineError } from '../InlineError';
import { SEPARATOR } from '../theme';
import { Text } from '../Text';
import { reportModel, type Line, type ReportExtras } from './model';
import { shareReport } from './share';

function LineView({ line }: { line: Line }) {
  switch (line.kind) {
    case 'row':
      return (
        <View className="gap-xxs py-xs">
          <Text variant="footnote" tone="secondary">
            {line.label}
          </Text>
          <Text variant="body">{line.value}</Text>
        </View>
      );
    case 'heading':
      return (
        <Text variant="footnote" tone="secondary" className="pt-sm">
          {line.text}
        </Text>
      );
    case 'quote':
      return (
        <View className="flex-row gap-sm py-xs">
          <View className={`w-0.5 ${SEPARATOR}`} />
          <Text variant="title3" className="flex-1">{`“${line.text}”`}</Text>
        </View>
      );
    case 'item':
      return (
        <Text variant="body" tone={line.urgent ? 'urgent' : 'label'} className={line.urgent ? 'font-bold' : ''}>
          {line.text}
        </Text>
      );
    case 'note':
      return (
        <Text variant="footnote" tone="secondary">
          {line.text}
        </Text>
      );
  }
}

// Plain report on the raised surface, system face: it is held up for a nurse, not browsed.
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
        <Text variant="footnote" tone="secondary">
          {model.made}
        </Text>
      </View>
      {model.sections.map((section) => (
        <View key={section.title} className="gap-xs">
          <Text variant="headline" accessibilityRole="header">
            {section.title}
          </Text>
          <View className={`h-px ${SEPARATOR}`} />
          <View>
            {section.lines.map((line, i) => (
              <LineView key={i} line={line} />
            ))}
          </View>
        </View>
      ))}
      <Text variant="footnote" tone="secondary">
        {model.footer}
      </Text>
      <View className="gap-xs">
        <CapsuleButton label={en('handoff.share')} onPress={share} loading={busy} />
        {failed ? <InlineError message={en('handoff.share.error')} /> : null}
        <CapsuleButton variant="neutral" label={en('result.back')} onPress={onBack} />
      </View>
    </View>
  );
}
