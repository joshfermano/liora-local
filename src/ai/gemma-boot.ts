import { setRouteActions, setWarmLine } from '../store/agent';
import { setAskIntent } from '../store/companion';
import { setAskModel, setRetrieveCard } from '../store/tell';
import { routeWithGemma } from './agent-router';
import { retrieveCard } from './card-index';
import { embedderBytesOnDisk } from './embedder';
import { GEMMA_MODEL_REF } from './gemma-model';
import { modelBytesOnDisk } from './gemma-native';
import { askGemma, askIntent, gemmaSession } from './gemma-session';
import { warmLine } from './warm';

// Loading takes about 15 s cold on the phone, longer than the 8 s answer budget, so start it at launch.
export function bootGemma(): boolean {
  setRetrieveCard(embedderBytesOnDisk() > 0 ? retrieveCard : null);
  if (modelBytesOnDisk() <= 0) {
    setAskModel(null);
    setAskIntent(null);
    setRouteActions(null);
    setWarmLine(null);
    return false;
  }
  setAskModel(askGemma, GEMMA_MODEL_REF);
  setAskIntent(askIntent);
  setRouteActions(routeWithGemma);
  setWarmLine(warmLine);
  gemmaSession().catch(() => {});
  return true;
}
