// How much longer the model may take here than on the phone. Always 1, except under the iOS Simulator
// test driver: there the model runs on the Mac through the simulator, several times slower, and the
// driver raises it so a test checks the model's words rather than the phone's time limits.
let scale = 1;

export const modelTime = (ms: number): number => ms * scale;

export function setModelTimeScale(n: number): void {
  scale = n;
}
