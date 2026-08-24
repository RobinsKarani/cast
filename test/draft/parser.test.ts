import { describe, it, expect } from 'bun:test';
import { DraftParser } from '@cast/core';

describe('DraftParser', () => {
  it('should parse markdown frontmatter correctly', () => {
    const markdown = `---
title: "Launch Post"
target: both
media: [./img1.png, ./img2.png]
tags: [ai, typescript]
---
Here is the actual post content.`;

    const parsed = DraftParser.parse(markdown);
    expect(parsed.title).toBe('Launch Post');
    expect(parsed.target).toBe('both');
    expect(parsed.mediaPaths).toEqual(['./img1.png', './img2.png']);
    expect(parsed.tags).toEqual(['ai', 'typescript']);
    expect(parsed.body).toBe('Here is the actual post content.');
  });

  it('should handle raw markdown without frontmatter', () => {
    const raw = 'Just a simple tweet without frontmatter';
    const parsed = DraftParser.parse(raw);
    expect(parsed.target).toBe('both');
    expect(parsed.body).toBe(raw);
    expect(parsed.title).toBeUndefined();
  });

  it('should serialize draft back to markdown frontmatter', () => {
    const serialized = DraftParser.serialize({
      title: 'Serialized Draft',
      target: 'x',
      mediaPaths: ['./asset.png'],
      tags: ['oss'],
      body: 'Body text here',
    });

    expect(serialized).toContain('title: "Serialized Draft"');
    expect(serialized).toContain('target: x');
    expect(serialized).toContain('media: ["./asset.png"]');
    expect(serialized).toContain('Body text here');
  });
});
