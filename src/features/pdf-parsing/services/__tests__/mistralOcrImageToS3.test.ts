/**
 * Tests unitaires — réécriture des références images Mistral OCR dans le markdown.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  replaceMistralImageRefsInMarkdown,
  processMistralOcrPageImages,
} from '../mistralOcrImageToS3';

const { uploadObjectMock, getObjectUrlMock } = vi.hoisted(() => ({
  uploadObjectMock: vi.fn().mockResolvedValue(undefined),
  getObjectUrlMock: vi.fn((key: string) => `https://bucket.s3.eu-west-1.amazonaws.com/${key}`),
}));

vi.mock('@/services/s3Service', () => ({
  s3Service: {
    validateFileType: vi.fn(),
    uploadObject: uploadObjectMock,
    getObjectUrl: getObjectUrlMock,
  },
}));

const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('replaceMistralImageRefsInMarkdown', () => {
  it('remplace ![alt](img-0.jpeg) par l’URL S3', () => {
    const md = '![Figure](img-0.jpeg)\nTexte';
    const out = replaceMistralImageRefsInMarkdown(
      md,
      'img-0.jpeg',
      'https://bucket.s3.eu-west-1.amazonaws.com/pdf-ocr/u/r/p0000/img-0.jpeg'
    );
    expect(out).toContain(
      '![Figure](https://bucket.s3.eu-west-1.amazonaws.com/pdf-ocr/u/r/p0000/img-0.jpeg)'
    );
    expect(out).not.toContain('](img-0.jpeg)');
  });

  it('remplace plusieurs occurrences du même id', () => {
    const md = '![a](img-1.png) et ![b](img-1.png)';
    const url = 'https://example.com/p0001/img-1.png';
    const out = replaceMistralImageRefsInMarkdown(md, 'img-1.png', url);
    expect(out).toBe(`![a](${url}) et ![b](${url})`);
  });

  it('ne modifie pas les parenthèses hors syntaxe image', () => {
    const md = 'Voir (img-0.jpeg) dans le texte';
    const out = replaceMistralImageRefsInMarkdown(md, 'img-0.jpeg', 'https://example.com/x');
    expect(out).toBe(md);
  });
});

describe('processMistralOcrPageImages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('upload les images et réécrit le markdown', async () => {
    const pages = await processMistralOcrPageImages(
      [
        {
          index: 0,
          markdown: '![fig](img-0.jpeg)\nHello',
          images: [{ id: 'img-0.jpeg', image_base64: TINY_PNG_BASE64 }],
        },
      ],
      'user-123',
      'req-abc'
    );

    expect(pages[0].markdown).toContain('https://bucket.s3.eu-west-1.amazonaws.com/pdf-ocr/');
    expect(pages[0].markdown).not.toContain('](img-0.jpeg)');
    expect(pages[0].images?.[0].image_base64).toBeUndefined();
    expect(uploadObjectMock).toHaveBeenCalledOnce();
    const key = uploadObjectMock.mock.calls[0][0] as string;
    expect(key).toContain('/p0000/');
  });

  it('utilise des clés S3 distinctes quand le même id apparaît sur deux pages', async () => {
    await processMistralOcrPageImages(
      [
        {
          index: 1,
          markdown: '![a](img-0.jpeg)',
          images: [{ id: 'img-0.jpeg', image_base64: TINY_PNG_BASE64 }],
        },
        {
          index: 2,
          markdown: '![b](img-0.jpeg)',
          images: [{ id: 'img-0.jpeg', image_base64: TINY_PNG_BASE64 }],
        },
      ],
      'user-1',
      'req-1'
    );

    expect(uploadObjectMock).toHaveBeenCalledTimes(2);
    const keys = uploadObjectMock.mock.calls.map((c) => c[0] as string);
    expect(keys[0]).toContain('/p0001/');
    expect(keys[1]).toContain('/p0002/');
    expect(keys[0]).not.toBe(keys[1]);
  });

  it('retourne les pages inchangées si userId manquant', async () => {
    const input = [
      {
        index: 0,
        markdown: '![x](img.png)',
        images: [{ id: 'img.png', image_base64: TINY_PNG_BASE64 }],
      },
    ];
    const pages = await processMistralOcrPageImages(input, '', 'req');
    expect(pages).toEqual(input);
    expect(uploadObjectMock).not.toHaveBeenCalled();
  });
});
