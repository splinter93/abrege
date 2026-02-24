# Audit – Images, fallback vision et erreurs 413

**Date :** 24 février 2026  
**Contexte :** Erreurs 413 en app Capacitor, modèles sans vision, fallback vers Llama Scout.

---

## 1. Résumé

- **Fallback modèle :** Le système utilise bien **Llama 4 Scout** (pas Maverick) quand il y a des images et que le modèle n’a pas la capacité `images`. Le code est cohérent ; un commentaire dans `ImageSupportRule` disait « Maverick » par erreur → corrigé.
- **413 :** Cause principale = **envoi de base64 inline** dans le body JSON (Next.js ou Groq refusent un body trop gros). Sur mobile, l’upload S3 peut être lent ou échouer ; si l’utilisateur envoie avant la fin de l’upload, le payload contient du base64 → 413.
- **Pas spécifique à l’app mobile :** Même logique web/mobile. Le mobile expose surtout la **condition de course** (envoyer avant que l’upload S3 soit terminé).

---

## 2. Fallback « modèle avec vision » (ImageSupportRule)

### Où c’est fait

- **Fichier :** `src/services/llm/modelOverride/rules/ImageSupportRule.ts`
- **Modèle de fallback :** `meta-llama/llama-4-scout-17b-16e-instruct` (Llama 4 Scout)
- **Enregistrement :** `src/services/llm/modelOverride/index.ts` (ImageSupportRule enregistrée en premier)

### Logique

1. **xAI** → pas de switch (vision native).
2. **Pas d’images** → pas de switch.
3. **Modèle actuel avec `capabilities` incluant `'images'`** (via `getModelInfo()` dans `groqModels.ts`) → pas de switch.
4. **Sinon** → passage à Llama 4 Scout.

`getModelInfo()` ne connaît que les modèles du registre `GROQ_MODELS` (tous providers). Si le modèle n’est pas dans la liste, il est considéré comme sans images → switch vers Scout. Scout et Maverick ont tous deux `capabilities: ['text', 'images', ...]` dans `groqModels.ts`.

### Correction faite

- Commentaire dans `apply()` : « switch vers Llama 4 Maverick » → « switch vers Llama 4 Scout (modèle avec vision) ».

---

## 3. Erreurs 413 – Cause et origine

### Causes possibles

| Origine | Quand | Remède |
|--------|--------|--------|
| **Next.js / Vercel** | Body JSON trop gros (ex. base64 dans `message`) | Ne pas envoyer de base64 ; éventuellement augmenter la limite body (voir ci‑dessous). |
| **Groq** | Payload trop gros (ex. images en base64) | Utiliser des URLs (S3 presignées) au lieu de base64. |

### Flux actuel

1. **Client :** L’utilisateur ajoute une image → `convertFileToBase64()` → image en base64 en state → `chatImageUploadService.uploadImages()` vers S3.
2. **Après succès S3 :** `setImages` remplace `base64` par l’URL S3.
3. **Envoi :** `buildMessageContent(text, images)` met `image.base64` (URL S3 ou base64) dans le contenu envoyé à l’API.

Si l’utilisateur envoie **avant** la fin de l’upload S3 (ou si l’upload échoue mais l’image reste en base64), le body contient du base64 → risque de 413 (web ou mobile, surtout mobile où l’upload est plus souvent lent / en échec).

### Corrections mises en place

1. **Ne pas autoriser l’envoi tant qu’une image est encore en base64**
   - `isImageUrlUploaded()` dans `src/utils/imageUtils.ts` : `true` si l’URL ne commence pas par `data:`.
   - Dans `ChatInput`, `canSend` exige que toutes les images soient « uploadées » :  
     `(images.length === 0 || images.every(img => isImageUrlUploaded(img.base64)))`.
2. **Feedback utilisateur**
   - Prop `imagesUploading` sur `ChatInputToolbar` : affichage de « Upload des images... » tant qu’il reste des images en base64.

Résultat : on n’envoie plus de base64 dans le body → plus de 413 liés aux images, y compris sur l’app Capacitor.

---

## 4. Vérifications effectuées

- **Stream route** (`src/app/api/chat/llm/stream/route.ts`) : détection `hasImages` après extraction des parties `image_url` du `message` ; appel à `modelOverrideService.resolveModelAndParams(overrideContext)` avec `hasImages` ; conversion des URLs S3 en presigned pour Groq/xAI/Liminality.
- **GroqProvider** : prise en charge des `attachedImages` et envoi des URLs (ou base64 si jamais encore présent) vers l’API Groq.
- **Capacitor :** Pas de branche spécifique pour les images ; même code que le web. Les 413 en mobile viennent du même cas (base64 dans le body), plus fréquent à cause du réseau/upload.

---

## 5. Option non appliquée (pour référence)

- **Limite body Next.js :** En App Router, on peut augmenter la taille du body par route (ex. `export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }` dans les Pages, ou équivalent selon la doc Next.js). Ce n’est pas fait ici : la stratégie retenue est de **ne jamais envoyer de base64** plutôt que d’augmenter la limite.

---

## 6. Fichiers modifiés

| Fichier | Modification |
|--------|---------------|
| `src/services/llm/modelOverride/rules/ImageSupportRule.ts` | Commentaire `apply()` : Maverick → Scout. |
| `src/utils/imageUtils.ts` | Ajout de `isImageUrlUploaded()`. |
| `src/components/chat/ChatInput.tsx` | `canSend` + prop `imagesUploading` basées sur `isImageUrlUploaded`. |
| `src/components/chat/ChatInputToolbar.tsx` | Prop `imagesUploading` et affichage « Upload des images... ». |

---

**Conclusion :** Le fallback vers Llama 4 Scout est correct. Les 413 viennent de l’envoi de base64 dans le body ; le correctif (bloquer l’envoi + message « Upload des images... » tant qu’une image n’est pas en URL) s’applique à toute l’app, y compris Capacitor.
