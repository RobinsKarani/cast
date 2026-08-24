import { describe, it, expect } from 'bun:test';
import { LinkedInAdapter } from '@cast/adapters';

describe('LinkedInAdapter', () => {
  const adapter = new LinkedInAdapter({
    credentials: { clientId: 'linkedin-client-id', clientSecret: 'linkedin-client-secret' },
  });

  it('should return correct capabilities', () => {
    const caps = adapter.getCapabilities();
    expect(caps.maxTextLength).toBe(3000);
    expect(caps.supportsThreads).toBe(false);
    expect(caps.supportsMedia).toBe(true);
    expect(caps.maxMediaCount).toBe(1);
    expect(caps.supportsBookmarks).toBe(false);
  });

  it('should generate valid LinkedIn OAuth URL', () => {
    const url = adapter.generateAuthUrl('test-state-linkedin');
    expect(url).toContain('https://www.linkedin.com/oauth/v2/authorization');
    expect(url).toContain('client_id=linkedin-client-id');
    expect(url).toContain('scope=openid+profile+email+w_member_social');
    expect(url).toContain('state=test-state-linkedin');
  });

  it('should validate text within 3000 characters', () => {
    const valid = adapter.validatePayload({ text: 'A'.repeat(500) });
    expect(valid.valid).toBe(true);

    const tooLong = adapter.validatePayload({ text: 'A'.repeat(3001) });
    expect(tooLong.valid).toBe(false);
    expect(tooLong.errors[0]).toContain('exceeds maximum length of 3000');
  });
});
