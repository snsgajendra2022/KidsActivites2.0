import { describe, expect, it } from 'vitest';
import {
  attachmentPreviewKind,
  attachmentPreviewText,
  attachmentUrlCandidates,
  formatAttachmentSize,
  hasChatAttachmentSource,
  isImageAttachment,
  isServerStoredAttachment,
  normalizeChatAttachment,
  normalizeChatMessage,
} from './chatAttachments.js';

describe('normalizeChatAttachment', () => {
  it('keeps the documented contract shape unchanged', () => {
    expect(normalizeChatAttachment({
      id: 'att-1',
      name: 'report.pdf',
      mimeType: 'application/pdf',
      size: 2048,
      url: 'https://cdn.example.com/report.pdf',
    })).toEqual({
      id: 'att-1',
      name: 'report.pdf',
      mimeType: 'application/pdf',
      size: 2048,
      url: 'https://cdn.example.com/report.pdf',
      fileKey: '',
    });
  });

  it('maps alternate server field names', () => {
    expect(normalizeChatAttachment({
      attachmentId: 'a-9',
      fileName: '2.png',
      contentType: 'image/png',
      sizeBytes: 512,
      downloadUrl: '/uploads/chat/2.png',
    })).toMatchObject({
      id: 'a-9',
      name: '2.png',
      mimeType: 'image/png',
      size: 512,
      url: '/uploads/chat/2.png',
    });
  });

  it('unwraps a nested attachment envelope', () => {
    expect(normalizeChatAttachment({ attachment: { id: 'a-1', name: 'x.png', url: '/x.png' } }))
      .toMatchObject({ id: 'a-1', name: 'x.png', url: '/x.png' });
  });

  it('treats a non-addressable value as a storage key', () => {
    expect(normalizeChatAttachment({ name: '2.png', fileKey: 'tenants/demo/chat/2.png' }))
      .toMatchObject({ url: '', fileKey: 'tenants/demo/chat/2.png' });
  });

  it('reads a bare string attachment', () => {
    expect(normalizeChatAttachment('https://cdn.example.com/a/2.png'))
      .toMatchObject({ name: '2.png', mimeType: 'image/png', url: 'https://cdn.example.com/a/2.png' });
  });

  it('infers the mime type from the file name when the server omits it', () => {
    const attachment = normalizeChatAttachment({ name: '2.png', url: '/2.png' });
    expect(attachment.mimeType).toBe('image/png');
    expect(isImageAttachment(attachment)).toBe(true);
  });

  it('flags attachments with no persisted source', () => {
    expect(hasChatAttachmentSource(normalizeChatAttachment({ name: '2.png' }))).toBe(false);
    expect(hasChatAttachmentSource(normalizeChatAttachment({ name: '2.png', url: '/2.png' }))).toBe(true);
  });
});

describe('isServerStoredAttachment', () => {
  it('rejects session-only data and object URLs', () => {
    expect(isServerStoredAttachment({ name: '2.png', url: 'data:image/png;base64,AAAA' })).toBe(false);
    expect(isServerStoredAttachment({ name: '2.png', url: 'blob:http://localhost/abc' })).toBe(false);
  });

  it('accepts server URLs and storage keys', () => {
    expect(isServerStoredAttachment({ url: '/uploads/chat/2.png' })).toBe(true);
    expect(isServerStoredAttachment({ url: 'https://cdn.example.com/2.png' })).toBe(true);
    expect(isServerStoredAttachment({ fileKey: 'tenants/demo/chat/2.png' })).toBe(true);
  });

  it('rejects an attachment carrying only a file name', () => {
    expect(isServerStoredAttachment({ name: '2.png' })).toBe(false);
    expect(isServerStoredAttachment(null)).toBe(false);
  });
});

describe('normalizeChatMessage', () => {
  it('normalizes every attachment on a message', () => {
    const message = normalizeChatMessage({
      id: 'm-1',
      text: '',
      attachments: [{ fileName: '2.png', fileUrl: '/2.png' }],
    });
    expect(message.attachments[0]).toMatchObject({ name: '2.png', url: '/2.png' });
    expect(attachmentPreviewText(message)).toBe('2.png');
  });

  it('leaves text-only messages untouched', () => {
    const message = { id: 'm-2', text: 'Hello' };
    expect(normalizeChatMessage(message)).toBe(message);
  });
});

describe('attachmentUrlCandidates', () => {
  const options = {
    apiBaseUrl: 'https://api.example.com/api/v1',
    origin: 'https://app.example.com',
    protocol: 'https:',
  };

  it('leaves absolute and session-local URLs alone', () => {
    expect(attachmentUrlCandidates('https://cdn.example.com/2.png', options))
      .toEqual(['https://cdn.example.com/2.png']);
    expect(attachmentUrlCandidates('data:image/png;base64,AAAA', options))
      .toEqual(['data:image/png;base64,AAAA']);
  });

  it('keeps the API path prefix for a path relative to the API base', () => {
    expect(attachmentUrlCandidates('/chat/attachments/att-1/download', options)).toEqual([
      'https://api.example.com/api/v1/chat/attachments/att-1/download',
      'https://api.example.com/chat/attachments/att-1/download',
      'https://app.example.com/chat/attachments/att-1/download',
    ]);
  });

  it('prefers the bare host for a static upload path', () => {
    expect(attachmentUrlCandidates('/uploads/chat/3_kids.png', options)[0])
      .toBe('https://api.example.com/uploads/chat/3_kids.png');
  });

  it('does not double the API prefix when the path already carries it', () => {
    expect(attachmentUrlCandidates('/api/v1/chat/attachments/att-1/download', options))
      .toEqual([
        'https://api.example.com/api/v1/chat/attachments/att-1/download',
        'https://app.example.com/api/v1/chat/attachments/att-1/download',
      ]);
  });

  it('returns nothing for an empty value', () => {
    expect(attachmentUrlCandidates('', options)).toEqual([]);
  });
});

describe('attachmentPreviewKind', () => {
  it('treats an image extension as an image despite a generic mime type', () => {
    const attachment = { name: '3_kids.png', mimeType: 'application/octet-stream' };
    expect(isImageAttachment(attachment)).toBe(true);
    expect(attachmentPreviewKind(attachment)).toBe('image');
  });

  it('recognises every supported image extension', () => {
    ['a.png', 'b.jpg', 'c.jpeg', 'd.gif', 'e.webp', 'f.svg', 'g.bmp', 'h.heic'].forEach((name) => {
      expect(isImageAttachment({ name })).toBe(true);
    });
  });

  it('detects PDFs and leaves other documents without a preview', () => {
    expect(attachmentPreviewKind({ name: 'report.pdf' })).toBe('pdf');
    expect(attachmentPreviewKind({ name: 'fees.xlsx' })).toBe('');
  });
});

describe('formatAttachmentSize', () => {
  it('renders nothing for unknown sizes', () => {
    expect(formatAttachmentSize(undefined)).toBe('');
    expect(formatAttachmentSize(0)).toBe('');
  });

  it('renders readable units', () => {
    expect(formatAttachmentSize(900)).toBe('900 B');
    expect(formatAttachmentSize(2048)).toBe('2 KB');
    expect(formatAttachmentSize(3 * 1024 * 1024)).toBe('3.0 MB');
  });
});
