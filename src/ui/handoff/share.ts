import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { en } from '../../content/copy';
import type { HandoffReport } from '../../core/handoff';
import { reportHtml } from './html';
import type { ReportExtras } from './model';

// The PDF is made on the phone; it goes nowhere unless she picks a place in the share sheet.
export async function shareReport(report: HandoffReport, extras: ReportExtras = {}): Promise<void> {
  const html = reportHtml(report, extras);
  if (Platform.OS === 'web' || !(await Sharing.isAvailableAsync())) {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: en('handoff.title') });
}
