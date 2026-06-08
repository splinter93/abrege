/**
 * Tests unitaires pour ChatPdfUploadService.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatPdfUploadService } from '../chatPdfUploadService';

describe('ChatPdfUploadService', () => {
  let service: ChatPdfUploadService;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    service = ChatPdfUploadService.getInstance();
  });

  it('uploadPdf: presign puis PUT S3', async () => {
    const file = new File(['%PDF-1.4'], 'doc.pdf', { type: 'application/pdf' });
    const sessionId = '550e8400-e29b-41d4-a716-446655440000';
    const token = 'test-token';

    (globalThis.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            upload_url: 'https://s3.example.com/upload',
            key: 'chat-pdfs/user/session/doc.pdf',
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
      });

    const result = await service.uploadPdf(file, sessionId, token);

    expect(result.key).toBe('chat-pdfs/user/session/doc.pdf');
    expect(result.fileName).toBe('doc.pdf');
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);

    const presignCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(presignCall[0]).toBe('/api/ui/chat-pdfs');
    expect(presignCall[1]?.headers?.Authorization).toBe('Bearer test-token');

    const s3Call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[1];
    expect(s3Call[0]).toBe('https://s3.example.com/upload');
    expect(s3Call[1]?.method).toBe('PUT');
  });

  it('uploadPdf: rejette un fichier non PDF', async () => {
    const file = new File(['hello'], 'doc.txt', { type: 'text/plain' });
    await expect(
      service.uploadPdf(file, '550e8400-e29b-41d4-a716-446655440000', 'token')
    ).rejects.toThrow(/PDF/);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('uploadPdf: erreur presign', async () => {
    const file = new File(['%PDF'], 'doc.pdf', { type: 'application/pdf' });

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: () => Promise.resolve({ error: 'Payload invalide' }),
    });

    await expect(
      service.uploadPdf(file, '550e8400-e29b-41d4-a716-446655440000', 'token')
    ).rejects.toThrow('Payload invalide');
  });

  it('uploadPdf: erreur PUT S3', async () => {
    const file = new File(['%PDF'], 'doc.pdf', { type: 'application/pdf' });

    (globalThis.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            upload_url: 'https://s3.example.com/upload',
            key: 'chat-pdfs/user/session/doc.pdf',
          }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

    await expect(
      service.uploadPdf(file, '550e8400-e29b-41d4-a716-446655440000', 'token')
    ).rejects.toThrow(/upload S3/);
  });
});
