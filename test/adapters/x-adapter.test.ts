import { describe, it, expect } from 'bun:test';
import { XAdapter } from '@cast/adapters';

describe('XAdapter', () => {
  const adapter = new XAdapter({
    credentials: { clientId: 'test-client-id', clientSecret: 'test-client-secret' },
  });

  it('should return correct capabilities', () => {
    const caps = adapter.getCapabilities();
    expect(caps.maxTextLength).toBe(280);
    expect(caps.supportsThreads).toBe(true);
    expect(caps.supportsMedia).toBe(true);
    expect(caps.maxMediaCount).toBe(4);
    expect(caps.supportsBookmarks).toBe(true);
  });

  it('should generate valid OAuth 2.0 PKCE auth URL', () => {
    const url = adapter.generateAuthUrl('test-state', 'test-challenge');
    expect(url).toContain('https://x.com/i/oauth2/authorize');
    expect(url).toContain('client_id=test-client-id');
    expect(url).toContain('code_challenge=test-challenge');
    expect(url).toContain('code_challenge_method=S256');
    expect(url).toContain('state=test-state');
    expect(url).toContain('tweet.write');
    expect(url).toContain('bookmark.read');
  });

  it('should validate character limits correctly', () => {
    const valid = adapter.validatePayload({ text: 'Hello, World!' });
    expect(valid.valid).toBe(true);

    const tooLong = adapter.validatePayload({ text: 'A'.repeat(281) });
    expect(tooLong.valid).toBe(false);
    expect(tooLong.errors[0]).toContain('exceeds maximum length of 280');
  });
});
