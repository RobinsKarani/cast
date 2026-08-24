import { describe, it, expect } from 'bun:test';
import { PKCEHelper } from '@cast/core';
import { createHash } from 'node:crypto';

describe('PKCEHelper', () => {
  it('should generate valid random strings', () => {
    const str1 = PKCEHelper.generateRandomString(32);
    const str2 = PKCEHelper.generateRandomString(32);
    expect(str1.length).toBe(32);
    expect(str2.length).toBe(32);
    expect(str1).not.toBe(str2);
  });

  it('should compute valid S256 code challenges', () => {
    const pair = PKCEHelper.generatePair();
    expect(pair.codeVerifier.length).toBeGreaterThanOrEqual(43);
    expect(pair.state.length).toBe(32);

    const expectedChallenge = createHash('sha256')
      .update(pair.codeVerifier)
      .digest('base64url');

    expect(pair.codeChallenge).toBe(expectedChallenge);
  });
});
