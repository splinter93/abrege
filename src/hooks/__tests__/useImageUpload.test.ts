/**
 * Tests unitaires pour useImageUpload
 * Focus: validation taille (10MB max) + formats autorisés
 * @module hooks/__tests__/useImageUpload
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useImageUpload } from '../useImageUpload';

// Mock chatImageUploadService
vi.mock('@/services/chatImageUploadService', () => ({
  chatImageUploadService: {
    uploadImages: vi.fn()
  }
}));

// Mock utils
vi.mock('@/utils/imageUtils', () => ({
  convertFileToBase64: vi.fn((file: File) => Promise.resolve(`data:${file.type};base64,mockBase64`)),
  revokeImageAttachments: vi.fn()
}));

import { chatImageUploadService } from '@/services/chatImageUploadService';

describe('useImageUpload', () => {
  const sessionId = 'test-session-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Validation taille fichier', () => {
    it('should reject files > 10MB', async () => {
      const { result } = renderHook(() => useImageUpload({ sessionId }));

      // Fichier de 11MB
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.png', { type: 'image/png' });

      let success: boolean = false;
      await act(async () => {
        success = await result.current.processAndUploadImage(largeFile);
      });

      expect(success).toBe(false);
      expect(result.current.uploadError).toContain('Image trop grande');
      expect(result.current.uploadError).toContain('11');
      expect(result.current.uploadError).toContain('10');
      expect(chatImageUploadService.uploadImages).not.toHaveBeenCalled();
    });

    it('should accept files <= 10MB', async () => {
      const { result } = renderHook(() => useImageUpload({ sessionId }));

      // Fichier de 5MB
      const validFile = new File(['x'.repeat(5 * 1024 * 1024)], 'valid.png', { type: 'image/png' });

      (chatImageUploadService.uploadImages as any).mockResolvedValue({
        success: true,
        images: [{ url: 'https://s3.example.com/image.png' }]
      });

      let success: boolean = false;
      await act(async () => {
        success = await result.current.processAndUploadImage(validFile);
      });

      expect(success).toBe(true);
      expect(result.current.uploadError).toBeNull();
      expect(chatImageUploadService.uploadImages).toHaveBeenCalled();
    });

    it('should accept files exactly 10MB', async () => {
      const { result } = renderHook(() => useImageUpload({ sessionId }));

      // Fichier exactement 10MB
      const exactFile = new File(['x'.repeat(10 * 1024 * 1024)], 'exact.png', { type: 'image/png' });

      (chatImageUploadService.uploadImages as any).mockResolvedValue({
        success: true,
        images: [{ url: 'https://s3.example.com/image.png' }]
      });

      let success: boolean = false;
      await act(async () => {
        success = await result.current.processAndUploadImage(exactFile);
      });

      expect(success).toBe(true);
      expect(result.current.uploadError).toBeNull();
    });
  });

  describe('Validation formats', () => {
    it('should accept JPEG format', async () => {
      const { result } = renderHook(() => useImageUpload({ sessionId }));

      const jpegFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      (chatImageUploadService.uploadImages as any).mockResolvedValue({
        success: true,
        images: [{ url: 'https://s3.example.com/image.jpg' }]
      });

      let success: boolean = false;
      await act(async () => {
        success = await result.current.processAndUploadImage(jpegFile);
      });

      expect(success).toBe(true);
      expect(result.current.uploadError).toBeNull();
    });

    it('should accept PNG format', async () => {
      const { result } = renderHook(() => useImageUpload({ sessionId }));

      const pngFile = new File(['test'], 'test.png', { type: 'image/png' });

      (chatImageUploadService.uploadImages as any).mockResolvedValue({
        success: true,
        images: [{ url: 'https://s3.example.com/image.png' }]
      });

      let success: boolean = false;
      await act(async () => {
        success = await result.current.processAndUploadImage(pngFile);
      });

      expect(success).toBe(true);
    });

    it('should accept GIF format', async () => {
      const { result } = renderHook(() => useImageUpload({ sessionId }));

      const gifFile = new File(['test'], 'test.gif', { type: 'image/gif' });

      (chatImageUploadService.uploadImages as any).mockResolvedValue({
        success: true,
        images: [{ url: 'https://s3.example.com/image.gif' }]
      });

      let success: boolean = false;
      await act(async () => {
        success = await result.current.processAndUploadImage(gifFile);
      });

      expect(success).toBe(true);
    });

    it('should accept WebP format', async () => {
      const { result } = renderHook(() => useImageUpload({ sessionId }));

      const webpFile = new File(['test'], 'test.webp', { type: 'image/webp' });

      (chatImageUploadService.uploadImages as any).mockResolvedValue({
        success: true,
        images: [{ url: 'https://s3.example.com/image.webp' }]
      });

      let success: boolean = false;
      await act(async () => {
        success = await result.current.processAndUploadImage(webpFile);
      });

      expect(success).toBe(true);
    });

    it('should reject unsupported formats (PDF, TXT, etc)', async () => {
      const { result } = renderHook(() => useImageUpload({ sessionId }));

      const pdfFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });

      let success: boolean = false;
      await act(async () => {
        success = await result.current.processAndUploadImage(pdfFile);
      });

      expect(success).toBe(false);
      expect(result.current.uploadError).toContain('Format non supporté');
      expect(result.current.uploadError).toContain('application/pdf');
      expect(chatImageUploadService.uploadImages).not.toHaveBeenCalled();
    });

    it('should reject image/svg+xml format', async () => {
      const { result } = renderHook(() => useImageUpload({ sessionId }));

      const svgFile = new File(['<svg></svg>'], 'test.svg', { type: 'image/svg+xml' });

      let success: boolean = false;
      await act(async () => {
        success = await result.current.processAndUploadImage(svgFile);
      });

      expect(success).toBe(false);
      expect(result.current.uploadError).toContain('Format non supporté');
    });
  });

  describe('Upload workflow', () => {
    it('should add image to state immediately with preview', async () => {
      const { result } = renderHook(() => useImageUpload({ sessionId }));

      const file = new File(['test'], 'test.png', { type: 'image/png' });

      (chatImageUploadService.uploadImages as any).mockResolvedValue({
        success: true,
        images: [{ url: 'https://s3.example.com/image.png' }]
      });

      await act(async () => {
        await result.current.processAndUploadImage(file);
      });

      // Vérifier qu'une image a été ajoutée
      expect(result.current.images.length).toBe(1);
      expect(result.current.images[0]).toHaveProperty('previewUrl');
      expect(result.current.images[0]).toHaveProperty('fileName', 'test.png');
      expect(result.current.images[0]).toHaveProperty('mimeType', 'image/png');
    });

    it('should update image with S3 URL after upload', async () => {
      const { result } = renderHook(() => useImageUpload({ sessionId }));

      const file = new File(['test'], 'test.png', { type: 'image/png' });

      (chatImageUploadService.uploadImages as any).mockResolvedValue({
        success: true,
        images: [{ url: 'https://s3.example.com/uploaded.png' }]
      });

      await act(async () => {
        await result.current.processAndUploadImage(file);
      });

      // Attendre que l'image soit mise à jour avec l'URL S3
      await waitFor(() => {
        expect(result.current.images[0].base64).toContain('s3.example.com');
      });
    });

    it('should handle upload S3 failure', async () => {
      const { result } = renderHook(() => useImageUpload({ sessionId }));

      const file = new File(['test'], 'test.png', { type: 'image/png' });

      (chatImageUploadService.uploadImages as any).mockResolvedValue({
        success: false,
        error: 'S3 upload failed'
      });

      let success: boolean = true;
      await act(async () => {
        success = await result.current.processAndUploadImage(file);
      });

      expect(success).toBe(false);
      expect(result.current.uploadError).toContain('test.png');
    });
  });

  describe('Image management', () => {
    it('should remove image by index', async () => {
      const { result } = renderHook(() => useImageUpload({ sessionId }));

      const file1 = new File(['test1'], 'test1.png', { type: 'image/png' });
      const file2 = new File(['test2'], 'test2.png', { type: 'image/png' });

      (chatImageUploadService.uploadImages as any).mockResolvedValue({
        success: true,
        images: [{ url: 'https://s3.example.com/image.png' }]
      });

      // Ajouter 2 images
      await act(async () => {
        await result.current.processAndUploadImage(file1);
        await result.current.processAndUploadImage(file2);
      });

      expect(result.current.images.length).toBe(2);

      // Supprimer la première
      act(() => {
        result.current.removeImage(0);
      });

      expect(result.current.images.length).toBe(1);
      expect(result.current.images[0].fileName).toBe('test2.png');
    });

    it('should clear all images', async () => {
      const { result } = renderHook(() => useImageUpload({ sessionId }));

      const file = new File(['test'], 'test.png', { type: 'image/png' });

      (chatImageUploadService.uploadImages as any).mockResolvedValue({
        success: true,
        images: [{ url: 'https://s3.example.com/image.png' }]
      });

      await act(async () => {
        await result.current.processAndUploadImage(file);
      });

      expect(result.current.images.length).toBe(1);

      act(() => {
        result.current.clearImages();
      });

      expect(result.current.images.length).toBe(0);
    });
  });
});

