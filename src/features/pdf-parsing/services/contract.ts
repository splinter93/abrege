/**
 * Contract pour les providers de parsing PDF.
 * Les adapters implémentent cette interface et normalisent les réponses vers les types canoniques.
 */

import type { PdfParseOptions, PdfParseResult, PdfParserHealthResult } from '../types';

export interface IPdfParserProvider {
  /**
   * Parse un PDF à partir du FormData (champ "file" + options éventuelles).
   * @param formData - FormData contenant le fichier (clé "file")
   * @param options - Options de parsing canoniques
   * @param requestQuery - Query string de la requête (pour forward vers upstream si besoin)
   */
  parse(
    formData: FormData,
    options: PdfParseOptions,
    requestQuery?: string
  ): Promise<PdfParseResult>;

  /**
   * Vérifie la disponibilité du service upstream.
   */
  healthCheck(): Promise<PdfParserHealthResult>;
}
