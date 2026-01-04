/**
 * Gestionnaire de connexions proxy
 * Extrait de XAIVoiceProxyService.ts pour réduire la taille du fichier principal
 */

import type { ActiveConnection } from './connectionTypes';

/**
 * Gestionnaire de connexions actives
 */
export class ConnectionManager {
  private connections: Map<string, ActiveConnection> = new Map();

  /**
   * Ajouter une connexion
   */
  add(connectionId: string, connection: ActiveConnection): void {
    this.connections.set(connectionId, connection);
  }

  /**
   * Récupérer une connexion
   */
  get(connectionId: string): ActiveConnection | undefined {
    return this.connections.get(connectionId);
  }

  /**
   * Supprimer une connexion
   */
  delete(connectionId: string): boolean {
    return this.connections.delete(connectionId);
  }

  /**
   * Récupérer toutes les connexions
   */
  getAll(): IterableIterator<[string, ActiveConnection]> {
    return this.connections.entries();
  }

  /**
   * Compter le nombre de connexions
   */
  count(): number {
    return this.connections.size;
  }

  /**
   * Vérifier si une connexion existe
   */
  has(connectionId: string): boolean {
    return this.connections.has(connectionId);
  }
}

