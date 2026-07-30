import { describe, expect, it, vi } from 'vitest';
import { createUuid } from './uuid';

describe('createUuid', () => {
  it('uses crypto.randomUUID when available', () => {
    const randomUUID = vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('123e4567-e89b-42d3-a456-426614174000');

    expect(createUuid()).toBe('123e4567-e89b-42d3-a456-426614174000');
    expect(randomUUID).toHaveBeenCalledOnce();
  });

  it('creates an RFC 4122 version 4 UUID when randomUUID is unavailable', () => {
    const original = globalThis.crypto.randomUUID;
    Object.defineProperty(globalThis.crypto, 'randomUUID', { configurable: true, value: undefined });
    vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((array) => {
      (array as Uint8Array).fill(0xab);
      return array;
    });

    try {
      expect(createUuid()).toBe('abababab-abab-4bab-abab-abababababab');
    } finally {
      Object.defineProperty(globalThis.crypto, 'randomUUID', { configurable: true, value: original });
    }
  });
});
