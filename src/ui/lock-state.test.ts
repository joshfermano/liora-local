import { describe, expect, it } from 'vitest';
import { lockOnChange } from './lock-state';

describe('lockOnChange', () => {
  it('locks again when the app goes to the background', () => {
    expect(lockOnChange('active', 'background')).toEqual({ relock: true, prompt: false });
  });
  it('asks for Face ID when she comes back from the background', () => {
    expect(lockOnChange('background', 'active')).toEqual({ relock: false, prompt: true });
  });
  it('does not ask again when the Face ID sheet itself closes, so a cancel cannot loop', () => {
    expect(lockOnChange('inactive', 'active')).toEqual({ relock: false, prompt: false });
    expect(lockOnChange('active', 'inactive')).toEqual({ relock: false, prompt: false });
  });
});
