import { setRouteActions, setSayReply } from '../store/agent';
import { setAskModel, setRetrieveCard } from '../store/tell';
import { sayReply } from './agent-loop';
import { routeWithGemma } from './agent-router';
import { retrieveCard } from './card-index';
import { embedderBytesOnDisk } from './embedder';
import { GEMMA_MODEL_REF } from './gemma-model';
import { modelBytesOnDisk } from './gemma-native';
import { askGemma, gemmaSession } from './gemma-session';

// Loading takes about 15 s cold on the phone, longer than the 8 s answer budget, so start it at launch.
export function bootGemma(): boolean {
  setRetrieveCard(embedderBytesOnDisk() > 0 ? retrieveCard : null);
  if (modelBytesOnDisk() <= 0) {
    setAskModel(null);
    setRouteActions(null);
    setSayReply(null);
    return false;
  }
  setAskModel(askGemma, GEMMA_MODEL_REF);
  setRouteActions(routeWithGemma);
  setSayReply(sayReply);
  gemmaSession().catch(() => {});
  return true;
}
