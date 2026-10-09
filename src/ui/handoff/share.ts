import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import { en } from '../../content/copy';
import type { HandoffReport } from '../../core/handoff';
import { reportHtml } from './html';
import type { ReportExtras } from './model';

// The PDF is made on the phone; it goes nowhere unless she picks a place in the share sheet.
// Loaded on use: an app built before expo-print and expo-sharing must not crash when this screen opens.
// Without them, sharing fails and the report screen says so.
function shareModules() {
  const ready = Platform.OS === 'web' || (requireOptionalNativeModule('ExpoPrint') && requireOptionalNativeModule('ExpoSharing'));
  if (!ready) throw new Error('This build cannot make the PDF yet; install the latest app');
  return { Print: require('expo-print') as typeof import('expo-print'), Sharing: require('expo-sharing') as typeof import('expo-sharing') };
}

export async function shareReport(report: HandoffReport, extras: ReportExtras = {}): Promise<void> {
  const { Print, Sharing } = shareModules();
  const html = reportHtml(report, extras);
  if (Platform.OS === 'web' || !(await Sharing.isAvailableAsync())) {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: en('handoff.title') });
}
