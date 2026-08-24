import { randomBytes, createHash } from 'node:crypto';
import type { PKCEPair } from '@cast/types';

export class PKCEHelper {
  /**
   * Generates a cryptographically secure random string of specified byte length.
   */
  static generateRandomString(length = 64): string {
    return randomBytes(length)
      .toString('base64url')
      .slice(0, length);
  }

  /**
   * Generates a PKCE code_verifier, code_challenge (S256), and random state.
   */
  static generatePair(): PKCEPair {
    const codeVerifier = this.generateRandomString(64);
    const codeChallenge = createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    const state = this.generateRandomString(32);

    return {
      codeVerifier,
      codeChallenge,
      state,
    };
  }

  /**
   * Computes the S256 code_challenge for a given verifier.
   */
  static computeChallenge(verifier: string): string {
    return createHash('sha256')
      .update(verifier)
      .digest('base64url');
  }
}
