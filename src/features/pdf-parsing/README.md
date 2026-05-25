# Feature PDF Parsing

Couche provider pour le parsing PDF : un seul point d’entrée applicatif (`/api/pdf/parse` + client), plusieurs backends interchangeables via la configuration.

## Changer de parseur

1. **Implémenter l’interface**  
   Créer un nouvel adapter dans `services/adapters/` qui implémente `IPdfParserProvider` (voir `services/contract.ts`) :
   - `parse(formData, options, requestQuery?)` → `Promise<PdfParseResult>`
   - `healthCheck()` → `Promise<PdfParserHealthResult>`

2. **Enregistrer dans la factory**  
   Dans `services/getPdfParserProvider.ts`, ajouter une branche pour le nouvel id (ex. `custom`) et instancier votre adapter. Utiliser une variable d’environnement dédiée pour l’URL (ex. `CUSTOM_PARSER_URL`).

3. **Configurer l’env**  
   Définir `PDF_PARSER_PROVIDER=custom` (et les variables d’URL du provider) dans `.env` / Vercel.

Les types canoniques (`PdfParseOptions`, `PdfParseResult`, `PdfParserHealthResult`) sont dans `types/index.ts`. Chaque adapter doit renvoyer ces formats (en normalisant la réponse de l’API externe si besoin).

### Mistral OCR — images

Mistral renvoie des références relatives dans le markdown (`![…](img-0.jpeg)`) et les binaires dans `pages[].images` (avec `include_image_base64`). L’adapter Mistral, lorsque `userId` est fourni par `/api/pdf/parse`, uploade chaque image sur S3 (`pdf-ocr/{userId}/{requestId}/p{pageIndex}/{imageId}` — l’index de page évite les collisions car Mistral réutilise `img-0.jpeg` sur chaque page) et réécrit le markdown avec l’URL publique S3.

## Structure

- `types/` — types canoniques (domaine)
- `services/contract.ts` — interface `IPdfParserProvider`
- `services/adapters/` — implémentations (Railway, Mistral OCR, etc.)
- `services/getPdfParserProvider.ts` — factory (env `PDF_PARSER_PROVIDER`)
- `services/pdfParserClient.ts` — client navigateur (appelle `/api/pdf/parse`)
- `validation/` — schéma Zod pour les query params de la route
- `utils/validatePdfFile.ts` — validation fichier (type, taille max)
