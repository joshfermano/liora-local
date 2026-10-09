import { useCompanionStore } from '../../store/companion';

// The companion store now carries send(text, input), undo and confirm itself.
export const agentStore = () => useCompanionStore.getState();
