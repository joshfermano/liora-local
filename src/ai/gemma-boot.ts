import { setAskModel } from '../store/tell';
import { modelBytesOnDisk } from './gemma-native';
import { askGemma, gemmaSession } from './gemma-session';

// Loading takes about 15 s cold on the phone, longer than the 8 s answer budget, so start it at launch.
export function bootGemma(): boolean {
  if (modelBytesOnDisk() <= 0) {
    setAskModel(null);
    return false;
  }
  setAskModel(askGemma);
  gemmaSession().catch(() => {});
  return true;
}
