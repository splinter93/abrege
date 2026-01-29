/**
 * Feature PDF Parsing — point d'entrée unique.
 * Types canoniques, client, validation, contract.
 */

export * from './types';
export { validatePdfFile } from './utils/validatePdfFile';
export type { ValidatePdfFileResult } from './utils/validatePdfFile';
export { pdfParserService } from './services/pdfParserClient';
export type { IPdfParserProvider } from './services/contract';
