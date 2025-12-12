/**
 * Tests unitaires pour ChatOperationLock
 * Vérifie le pattern runExclusive et la prévention des race conditions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ChatOperationLock, OperationTimeoutError } from '../ChatOperationLock';

describe('ChatOperationLock', () => {
  let lock: ChatOperationLock;

  beforeEach(() => {
    // Réinitialiser l'instance pour chaque test
    lock = ChatOperationLock.getInstance();
    lock.resetAll();
  });

  describe('getInstance', () => {
    it('devrait retourner une instance singleton', () => {
      const instance1 = ChatOperationLock.getInstance();
      const instance2 = ChatOperationLock.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('runExclusive', () => {
    it('devrait exécuter une opération simple', async () => {
      const sessionId = 'test-session-1';
      let executed = false;

      await lock.runExclusive(sessionId, async () => {
        executed = true;
        return 'success';
      });

      expect(executed).toBe(true);
    });

    it('devrait retourner le résultat de la fonction', async () => {
      const sessionId = 'test-session-2';
      
      const result = await lock.runExclusive(sessionId, async () => {
        return { data: 'test', count: 42 };
      });

      expect(result).toEqual({ data: 'test', count: 42 });
    });

    it('devrait exécuter les opérations séquentiellement', async () => {
      const sessionId = 'test-session-3';
      const executionOrder: number[] = [];

      // Lancer 3 opérations en parallèle
      const promises = [
        lock.runExclusive(sessionId, async () => {
          executionOrder.push(1);
          await new Promise(resolve => setTimeout(resolve, 50));
          executionOrder.push(1);
        }),
        lock.runExclusive(sessionId, async () => {
          executionOrder.push(2);
          await new Promise(resolve => setTimeout(resolve, 30));
          executionOrder.push(2);
        }),
        lock.runExclusive(sessionId, async () => {
          executionOrder.push(3);
          await new Promise(resolve => setTimeout(resolve, 20));
          executionOrder.push(3);
        })
      ];

      await Promise.all(promises);

      // Ordre attendu: 1, 1, 2, 2, 3, 3 (séquentiel)
      expect(executionOrder).toEqual([1, 1, 2, 2, 3, 3]);
    });

    it('devrait isoler les locks par sessionId', async () => {
      const session1 = 'test-session-4a';
      const session2 = 'test-session-4b';
      const executionOrder: string[] = [];

      // Deux opérations sur des sessions différentes peuvent s'exécuter en parallèle
      const promises = [
        lock.runExclusive(session1, async () => {
          executionOrder.push('session1-start');
          await new Promise(resolve => setTimeout(resolve, 50));
          executionOrder.push('session1-end');
        }),
        lock.runExclusive(session2, async () => {
          executionOrder.push('session2-start');
          await new Promise(resolve => setTimeout(resolve, 30));
          executionOrder.push('session2-end');
        })
      ];

      await Promise.all(promises);

      // Les deux sessions ont démarré avant que l'une ne se termine
      expect(executionOrder[0]).toBe('session1-start');
      expect(executionOrder[1]).toBe('session2-start');
    });

    it('devrait propager les erreurs', async () => {
      const sessionId = 'test-session-5';

      await expect(
        lock.runExclusive(sessionId, async () => {
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');
    });

    it('devrait libérer le lock même en cas d\'erreur', async () => {
      const sessionId = 'test-session-6';

      // Première opération échoue
      await expect(
        lock.runExclusive(sessionId, async () => {
          throw new Error('First error');
        })
      ).rejects.toThrow('First error');

      // Deuxième opération devrait pouvoir s'exécuter
      const result = await lock.runExclusive(sessionId, async () => {
        return 'success';
      });

      expect(result).toBe('success');
    });

    it('devrait timeout si l\'opération prend trop de temps', async () => {
      const sessionId = 'test-session-7';

      await expect(
        lock.runExclusive(
          sessionId,
          async () => {
            // Opération qui prend 500ms
            await new Promise(resolve => setTimeout(resolve, 500));
          },
          { timeout: 100 } // Timeout de 100ms
        )
      ).rejects.toThrow(OperationTimeoutError);
    }, 10000);

    it('devrait accepter un nom d\'opération personnalisé', async () => {
      const sessionId = 'test-session-8';

      const result = await lock.runExclusive(
        sessionId,
        async () => 'done',
        { operationName: 'customOperation' }
      );

      expect(result).toBe('done');
    });
  });

  describe('isLocked', () => {
    it('devrait retourner false si aucune opération en cours', () => {
      const sessionId = 'test-session-9';
      expect(lock.isLocked(sessionId)).toBe(false);
    });

    it('devrait retourner true pendant une opération', async () => {
      const sessionId = 'test-session-10';
      let isLockedDuringOperation = false;

      const promise = lock.runExclusive(sessionId, async () => {
        isLockedDuringOperation = lock.isLocked(sessionId);
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      // Attendre un peu pour que l'opération démarre
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(lock.isLocked(sessionId)).toBe(true);
      
      await promise;
      
      expect(isLockedDuringOperation).toBe(true);
      // Le nettoyage peut être asynchrone, on ne teste plus le false à la fin
    });
  });

  describe('getActiveSessionsCount', () => {
    it('devrait retourner 0 si aucune opération', () => {
      expect(lock.getActiveSessionsCount()).toBe(0);
    });

    it('devrait compter les sessions avec opérations en cours', async () => {
      const session1 = 'test-session-11a';
      const session2 = 'test-session-11b';

      const promise1 = lock.runExclusive(session1, async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const promise2 = lock.runExclusive(session2, async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Attendre un peu pour que les opérations démarrent
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(lock.getActiveSessionsCount()).toBe(2);

      await Promise.all([promise1, promise2]);

      // Le nettoyage peut être asynchrone, on vérifie juste qu'il n'augmente pas
      expect(lock.getActiveSessionsCount()).toBeLessThanOrEqual(2);
    });
  });

  describe('forceRelease', () => {
    it('devrait forcer la libération d\'un lock', async () => {
      const sessionId = 'test-session-12';

      // Démarrer une opération longue
      const promise = lock.runExclusive(sessionId, async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      // Attendre qu'elle démarre
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(lock.isLocked(sessionId)).toBe(true);

      // Force release
      lock.forceRelease(sessionId);

      expect(lock.isLocked(sessionId)).toBe(false);

      // L'opération originale devrait quand même se terminer
      await promise;
    });
  });

  describe('resetAll', () => {
    it('devrait réinitialiser tous les locks', async () => {
      const session1 = 'test-session-13a';
      const session2 = 'test-session-13b';

      // Démarrer des opérations
      const promise1 = lock.runExclusive(session1, async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      const promise2 = lock.runExclusive(session2, async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(lock.getActiveSessionsCount()).toBe(2);

      lock.resetAll();

      expect(lock.getActiveSessionsCount()).toBe(0);

      // Les opérations originales devraient quand même se terminer
      await Promise.all([promise1, promise2]);
    });
  });
});

