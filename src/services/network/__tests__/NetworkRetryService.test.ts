/**
 * Tests unitaires pour NetworkRetryService
 * 
 * Conforme GUIDE-EXCELLENCE-CODE.md :
 * - Tests unitaires > 80% couverture
 * - Tests de retry et exponential backoff
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NetworkRetryService, RecoverableNetworkError, type NetworkError } from '../NetworkRetryService';

describe('NetworkRetryService', () => {
  let service: NetworkRetryService;

  beforeEach(() => {
    service = NetworkRetryService.getInstance();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('isRecoverableError', () => {
    it('should return true for 502 Bad Gateway', () => {
      const error = new Error('Bad Gateway') as NetworkError;
      error.statusCode = 502;
      error.errorType = RecoverableNetworkError.BAD_GATEWAY;
      error.isRecoverable = true;

      expect(service.isRecoverableError(error)).toBe(true);
    });

    it('should return true for 503 Service Unavailable', () => {
      const error = new Error('Service Unavailable') as NetworkError;
      error.statusCode = 503;
      error.errorType = RecoverableNetworkError.SERVICE_UNAVAILABLE;
      error.isRecoverable = true;

      expect(service.isRecoverableError(error)).toBe(true);
    });

    it('should return true for 429 Rate Limit', () => {
      const error = new Error('Rate Limit') as NetworkError;
      error.statusCode = 429;
      error.errorType = RecoverableNetworkError.RATE_LIMIT;
      error.isRecoverable = true;

      expect(service.isRecoverableError(error)).toBe(true);
    });

    it('should return false for 400 Bad Request', () => {
      const error = new Error('Bad Request') as NetworkError;
      error.statusCode = 400;
      error.isRecoverable = false;

      expect(service.isRecoverableError(error)).toBe(false);
    });

    it('should return false for 401 Unauthorized', () => {
      const error = new Error('Unauthorized') as NetworkError;
      error.statusCode = 401;
      error.isRecoverable = false;

      expect(service.isRecoverableError(error)).toBe(false);
    });

    it('should return true for timeout errors', () => {
      const error = new Error('Request timeout') as NetworkError;
      error.errorType = RecoverableNetworkError.TIMEOUT;
      error.isRecoverable = true;

      expect(service.isRecoverableError(error)).toBe(true);
    });

    it('should return true for network errors', () => {
      const error = new Error('Failed to fetch') as NetworkError;
      error.errorType = RecoverableNetworkError.NETWORK_ERROR;
      error.isRecoverable = true;

      expect(service.isRecoverableError(error)).toBe(true);
    });
  });

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const result = await service.executeWithRetry(fn, {
        maxRetries: 3,
        operationName: 'test-operation'
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on recoverable error and succeed', async () => {
      const recoverableError = new Error('Bad Gateway') as NetworkError;
      recoverableError.statusCode = 502;
      recoverableError.errorType = RecoverableNetworkError.BAD_GATEWAY;
      recoverableError.isRecoverable = true;

      const fn = vi.fn()
        .mockRejectedValueOnce(recoverableError)
        .mockResolvedValueOnce('success');

      const promise = service.executeWithRetry(fn, {
        maxRetries: 3,
        initialDelay: 100,
        operationName: 'test-operation'
      });

      // Avancer le temps pour le délai
      await vi.advanceTimersByTimeAsync(100);

      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      const recoverableError = new Error('Bad Gateway') as NetworkError;
      recoverableError.statusCode = 502;
      recoverableError.errorType = RecoverableNetworkError.BAD_GATEWAY;
      recoverableError.isRecoverable = true;

      const fn = vi.fn().mockRejectedValue(recoverableError);

      const promise = service.executeWithRetry(fn, {
        maxRetries: 3,
        initialDelay: 100,
        operationName: 'test-operation'
      });

      // Avancer le temps pour tous les délais (100ms + 200ms = 300ms total)
      await vi.advanceTimersByTimeAsync(300);

      await expect(promise).rejects.toThrow('Bad Gateway');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-recoverable error', async () => {
      const nonRecoverableError = new Error('Bad Request') as NetworkError;
      nonRecoverableError.statusCode = 400;
      nonRecoverableError.isRecoverable = false;

      const fn = vi.fn().mockRejectedValue(nonRecoverableError);

      const promise = service.executeWithRetry(fn, {
        maxRetries: 3,
        operationName: 'test-operation'
      });

      await expect(promise).rejects.toThrow('Bad Request');
      expect(fn).toHaveBeenCalledTimes(1); // Pas de retry
    });

    it('should use exponential backoff', async () => {
      const recoverableError = new Error('Bad Gateway') as NetworkError;
      recoverableError.statusCode = 502;
      recoverableError.errorType = RecoverableNetworkError.BAD_GATEWAY;
      recoverableError.isRecoverable = true;

      const fn = vi.fn().mockRejectedValue(recoverableError);

      const promise = service.executeWithRetry(fn, {
        maxRetries: 3,
        initialDelay: 100,
        backoffMultiplier: 2,
        operationName: 'test-operation'
      });

      // Tentative 1 → échec → attendre 100ms
      await vi.advanceTimersByTimeAsync(100);
      expect(fn).toHaveBeenCalledTimes(2);

      // Tentative 2 → échec → attendre 200ms (100 * 2^1)
      await vi.advanceTimersByTimeAsync(200);
      expect(fn).toHaveBeenCalledTimes(3);

      // Tentative 3 → échec → fin (pas de délai après dernière tentative)
      await expect(promise).rejects.toThrow('Bad Gateway');
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe('createNetworkError', () => {
    it('should create NetworkError from Response 502', () => {
      const response = new Response('Bad Gateway', { status: 502 });
      const error = service.createNetworkError(response);

      expect(error.statusCode).toBe(502);
      expect(error.errorType).toBe(RecoverableNetworkError.BAD_GATEWAY);
      expect(error.isRecoverable).toBe(true);
    });

    it('should create NetworkError from Response 503', () => {
      const response = new Response('Service Unavailable', { status: 503 });
      const error = service.createNetworkError(response);

      expect(error.statusCode).toBe(503);
      expect(error.errorType).toBe(RecoverableNetworkError.SERVICE_UNAVAILABLE);
      expect(error.isRecoverable).toBe(true);
    });

    it('should create NetworkError from Response 429', () => {
      const response = new Response('Rate Limit', { status: 429 });
      const error = service.createNetworkError(response);

      expect(error.statusCode).toBe(429);
      expect(error.errorType).toBe(RecoverableNetworkError.RATE_LIMIT);
      expect(error.isRecoverable).toBe(true);
    });
  });
});

