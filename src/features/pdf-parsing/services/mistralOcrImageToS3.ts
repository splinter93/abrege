/**
 * Extrait les images Mistral OCR (base64), les envoie sur S3 et réécrit le markdown.
 * @see https://docs.mistral.ai/api/endpoint/ocr — pages[].images[].id + image_base64
 */

import { logger, LogCategory } from '@/utils/logger';
import type { S3Service } from '@/services/s3Service';

async function getS3Service(): Promise<S3Service> {
  const { s3Service } = await import('@/services/s3Service');
  return s3Service;
}

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
type AllowedMime = (typeof ALLOWED_MIME)[number];

export interface MistralOcrImage {
  id: string;
  image_base64?: string;
}

export interface MistralOcrPageWithImages {
  index: number;
  markdown?: string;
  images?: MistralOcrImage[];
  tables?: unknown[];
  dimensions?: { dpi?: number; height?: number; width?: number };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Remplace les références markdown ![…](imageId) par l'URL S3 publique.
 * Ne touche qu'au format image (pas les parenthèses nues dans le texte).
 */
export function replaceMistralImageRefsInMarkdown(
  markdown: string,
  imageId: string,
  publicUrl: string
): string {
  const id = escapeRegExp(imageId);
  const pattern = new RegExp(`!\\[([^\\]]*)\\]\\(${id}\\)`, 'g');
  return markdown.replace(pattern, (_match, alt: string) => {
    const label = alt.length > 0 ? alt : imageId;
    return `![${label}](${publicUrl})`;
  });
}

function mimeFromImageId(imageId: string): AllowedMime {
  const ext = imageId.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    default:
      return 'image/jpeg';
  }
}

function decodeImageBase64(raw: string): Buffer | null {
  try {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const dataUrlMatch = /^data:([^;]+);base64,(.+)$/i.exec(trimmed);
    const payload = dataUrlMatch ? dataUrlMatch[2] : trimmed;
    const buffer = Buffer.from(payload, 'base64');
    return buffer.length > 0 ? buffer : null;
  } catch {
    return null;
  }
}

function sanitizePathSegment(segment: string): string {
  const cleaned = segment.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  return cleaned.length > 0 ? cleaned : 'segment';
}

function buildS3Key(userId: string, requestId: string, pageIndex: number, imageId: string): string {
  const pagePart = `p${String(pageIndex).padStart(4, '0')}`;
  return `pdf-ocr/${userId}/${requestId}/${pagePart}/${sanitizePathSegment(imageId)}`;
}

async function uploadOneMistralImage(params: {
  image: MistralOcrImage;
  pageIndex: number;
  safeUserId: string;
  safeRequestId: string;
}): Promise<{ imageId: string; publicUrl?: string }> {
  const { image, pageIndex, safeUserId, safeRequestId } = params;
  const imageId = image.id?.trim();
  if (!imageId || !image.image_base64) {
    return { imageId: imageId ?? '' };
  }

  const buffer = decodeImageBase64(image.image_base64);
  if (!buffer || buffer.length > MAX_IMAGE_BYTES) {
    logger.warn(LogCategory.API, '[mistralOcrImageToS3] taille ou base64 invalide', {
      imageId,
      pageIndex,
      bytes: buffer?.length ?? 0,
    });
    return { imageId };
  }

  const mime = mimeFromImageId(imageId);
  const s3 = await getS3Service();
  s3.validateFileType(mime, [...ALLOWED_MIME]);

  const key = buildS3Key(safeUserId, safeRequestId, pageIndex, imageId);
  await s3.uploadObject(key, buffer, mime);
  const publicUrl = s3.getObjectUrl(key);
  logger.info(LogCategory.API, '[mistralOcrImageToS3] image uploadée', { imageId, pageIndex, key });
  return { imageId, publicUrl };
}

/**
 * Pour chaque page : upload images → URLs S3, réécriture du markdown, suppression des base64.
 * Les ids Mistral (ex. img-0.jpeg) sont réutilisés par page : la clé S3 inclut l'index de page.
 */
export async function processMistralOcrPageImages(
  pages: MistralOcrPageWithImages[],
  userId: string,
  requestId: string
): Promise<MistralOcrPageWithImages[]> {
  const trimmedUserId = userId?.trim();
  const trimmedRequestId = requestId?.trim();
  if (!trimmedUserId || !trimmedRequestId) {
    logger.warn(LogCategory.API, '[mistralOcrImageToS3] userId ou requestId manquant, skip upload');
    return pages;
  }

  const safeUserId = sanitizePathSegment(trimmedUserId);
  const safeRequestId = sanitizePathSegment(trimmedRequestId);

  const result: MistralOcrPageWithImages[] = [];

  for (const page of pages) {
    let markdown = page.markdown ?? '';
    const images = page.images ?? [];
    const uploadedImages: MistralOcrImage[] = [];

    const uploadOutcomes = await Promise.all(
      images.map(async (image) => {
        try {
          return await uploadOneMistralImage({
            image,
            pageIndex: page.index,
            safeUserId,
            safeRequestId,
          });
        } catch (err) {
          logger.warn(LogCategory.API, '[mistralOcrImageToS3] échec upload image', {
            imageId: image.id,
            pageIndex: page.index,
            error: err instanceof Error ? err.message : String(err),
          });
          return { imageId: image.id?.trim() ?? '' };
        }
      })
    );

    for (const outcome of uploadOutcomes) {
      if (outcome.imageId) {
        uploadedImages.push({ id: outcome.imageId });
      }
      if (outcome.publicUrl && outcome.imageId) {
        markdown = replaceMistralImageRefsInMarkdown(markdown, outcome.imageId, outcome.publicUrl);
      }
    }

    result.push({
      ...page,
      markdown,
      images: uploadedImages,
    });
  }

  return result;
}
