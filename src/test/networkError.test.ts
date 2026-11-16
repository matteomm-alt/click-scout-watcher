import { describe, it, expect } from 'vitest';
import { isNetworkError } from '@/lib/networkError';

describe('isNetworkError', () => {
  it('riconosce gli errori di rete dei browser', () => {
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isNetworkError('NetworkError when attempting to fetch resource.')).toBe(true);
    expect(isNetworkError({ message: 'Load failed' })).toBe(true);
  });
  it('non scambia errori di dati per errori di rete', () => {
    expect(isNetworkError('Invalid login credentials')).toBe(false);
    expect(isNetworkError({ message: 'duplicate key value' })).toBe(false);
    expect(isNetworkError(null)).toBe(false);
  });
});
