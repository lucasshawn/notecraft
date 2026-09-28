import { describe, it, expect } from 'vitest';

describe('Project Environment', () => {
  it('verifies test environment and typescript execution', () => {
    const appName: string = 'Notecraft';
    expect(appName).toBe('Notecraft');
  });
});
