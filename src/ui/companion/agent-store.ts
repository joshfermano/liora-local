import { useCompanionStore } from '../../store/companion';

type Input = 'voice' | 'text';
type State = ReturnType<typeof useCompanionStore.getState>;

// undo, confirm and send's input argument are added to the store alongside these screens.
interface AgentStore extends Omit<State, 'send'> {
  send(text: string, input?: Input): Promise<void>;
  undo?(undoId: string): Promise<void> | void;
  confirm?(confirmId: string, yes: boolean): Promise<void> | void;
}

export const agentStore = () => useCompanionStore.getState() as unknown as AgentStore;
