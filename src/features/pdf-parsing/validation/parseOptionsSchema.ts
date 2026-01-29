/**
 * Schéma Zod pour les query params de la route POST /api/pdf/parse.
 * Construit PdfParseOptions à partir des paramètres string.
 */

import { z } from 'zod';
import type { PdfParseOptions } from '../types';

const resultTypeEnum = z.enum(['markdown', 'text', 'json']);
const presetEnum = z.enum([
  'default',
  'insurance',
  'invoice',
  'contract',
  'scientific',
]);

export const parseOptionsQuerySchema = z.object({
  result_type: resultTypeEnum.optional().default('markdown'),
  split_by_page: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1'),
  preset: presetEnum.optional(),
  include_tables: z
    .string()
    .optional()
    .transform((v) => (v === 'false' || v === '0' ? false : true)),
});

export type ParseOptionsQuery = z.infer<typeof parseOptionsQuerySchema>;

/**
 * Convertit le résultat Zod (query) en PdfParseOptions canonique.
 */
export function queryToPdfParseOptions(query: ParseOptionsQuery): PdfParseOptions {
  return {
    resultType: query.result_type,
    splitByPage: query.split_by_page,
    preset: query.preset,
    includeTables: query.include_tables,
  };
}
