/**
 * Exemples d'utilisation de xAI Grok avec images
 * 
 * xAI Grok supporte nativement les images (jpg/jpeg/png, max 20 Mo)
 * Compatible format OpenAI avec content multi-part
 */

import { XAIProvider } from '@/services/llm/providers';
import type { Tool } from '@/services/llm/types/strictTypes';
import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// EXEMPLE 1 : Analyse d'image simple via URL
// =============================================================================

async function exemple1_ImageURL() {
  console.log('\n=== EXEMPLE 1 : Analyse d\'image via URL ===\n');
  
  const xai = new XAIProvider({
    model: 'grok-4-fast',
    temperature: 0.7
  });

  const response = await xai.callWithImages(
    'Décris cette image en détail.',
    [
      {
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg',
        detail: 'high' // 'auto' | 'low' | 'high'
      }
    ],
    {
      systemMessage: 'Tu es un assistant d\'analyse d\'images expert.'
    }
  );

  console.log('Réponse:', response.content);
}

// =============================================================================
// EXEMPLE 2 : Analyse d'image locale (base64)
// =============================================================================

async function exemple2_ImageBase64() {
  console.log('\n=== EXEMPLE 2 : Analyse d\'image locale (base64) ===\n');
  
  const xai = new XAIProvider();

  // Charger une image locale
  const imagePath = path.join(__dirname, '../public/logo_scrivia_white.png');
  
  if (fs.existsSync(imagePath)) {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = XAIProvider.encodeImageToBase64(imageBuffer, 'image/png');

    const response = await xai.callWithImages(
      'Qu\'est-ce que ce logo représente ? Analyse les couleurs et le design.',
      [
        {
          url: base64Image,
          detail: 'auto'
        }
      ]
    );

    console.log('Réponse:', response.content);
  } else {
    console.log('⚠️ Image non trouvée:', imagePath);
  }
}

// =============================================================================
// EXEMPLE 3 : Analyse de plusieurs images
// =============================================================================

async function exemple3_MultipleImages() {
  console.log('\n=== EXEMPLE 3 : Analyse de plusieurs images ===\n');
  
  const xai = new XAIProvider({
    model: 'grok-4-fast',
    temperature: 0.7
  });

  const response = await xai.callWithImages(
    'Compare ces deux images. Quelles sont leurs différences et similitudes ?',
    [
      {
        url: 'https://example.com/image1.jpg',
        detail: 'high'
      },
      {
        url: 'https://example.com/image2.jpg',
        detail: 'high'
      }
    ],
    {
      systemMessage: 'Tu es un expert en analyse comparative d\'images.'
    }
  );

  console.log('Réponse:', response.content);
}

// =============================================================================
// EXEMPLE 4 : Image + Function calling
// =============================================================================

async function exemple4_ImageWithTools() {
  console.log('\n=== EXEMPLE 4 : Image + Function calling ===\n');
  
  const xai = new XAIProvider();

  // Tools pour extraire des informations
  const tools: Tool[] = [
    {
      type: 'function',
      function: {
        name: 'save_image_analysis',
        description: 'Sauvegarder l\'analyse d\'une image dans une note',
        parameters: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Titre de la note'
            },
            analysis: {
              type: 'string',
              description: 'Analyse complète de l\'image'
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tags pour catégoriser l\'image'
            }
          },
          required: ['title', 'analysis']
        }
      }
    }
  ];

  const response = await xai.callWithImages(
    'Analyse cette image et sauvegarde ton analyse dans une note avec des tags appropriés.',
    [
      {
        url: 'https://example.com/document.jpg',
        detail: 'high'
      }
    ],
    {
      systemMessage: 'Tu es un assistant qui analyse et organise des images.'
    },
    [], // history
    tools
  );

  console.log('Réponse:', response.content);
  console.log('Tool calls:', response.tool_calls);
}

// =============================================================================
// EXEMPLE 5 : Screenshot d'interface + analyse UX
// =============================================================================

async function exemple5_UIAnalysis() {
  console.log('\n=== EXEMPLE 5 : Analyse UX d\'interface ===\n');
  
  const xai = new XAIProvider({
    model: 'grok-4-fast',
    temperature: 0.7
  });

  const response = await xai.callWithImages(
    `Analyse cette interface utilisateur et donne-moi:
    1. Les points forts du design
    2. Les problèmes d'UX identifiés
    3. 3 suggestions d'amélioration concrètes`,
    [
      {
        url: 'https://example.com/screenshot-ui.png',
        detail: 'high' // High detail pour capturer les détails de l'UI
      }
    ],
    {
      systemMessage: 'Tu es un expert UX/UI designer avec 10 ans d\'expérience.',
      temperature: 0.7,
      maxTokens: 2000
    }
  );

  console.log('Analyse UX:', response.content);
}

// =============================================================================
// EXEMPLE 6 : OCR - Extraction de texte depuis image
// =============================================================================

async function exemple6_OCR() {
  console.log('\n=== EXEMPLE 6 : OCR - Extraction de texte ===\n');
  
  const xai = new XAIProvider();

  const response = await xai.callWithImages(
    'Extrait tout le texte visible dans cette image. Formate-le proprement en markdown.',
    [
      {
        url: 'https://example.com/document-scan.jpg',
        detail: 'high' // High detail pour une meilleure précision OCR
      }
    ],
    {
      systemMessage: 'Tu es un expert en OCR. Extrais le texte avec une grande précision.',
      temperature: 0.3 // Basse température pour plus de précision
    }
  );

  console.log('Texte extrait:', response.content);
}

// =============================================================================
// EXEMPLE 7 : Diagramme technique + explication
// =============================================================================

async function exemple7_TechnicalDiagram() {
  console.log('\n=== EXEMPLE 7 : Analyse de diagramme technique ===\n');
  
  const xai = new XAIProvider({
    model: 'grok-4-fast-reasoning', // Reasoning pour analyse technique
    temperature: 0.7
  });

  const response = await xai.callWithImages(
    'Explique ce diagramme d\'architecture en détail. Identifie les composants, les flux de données, et les potentiels points de défaillance.',
    [
      {
        url: 'https://example.com/architecture-diagram.png',
        detail: 'high'
      }
    ],
    {
      systemMessage: 'Tu es un architecte logiciel senior.'
    }
  );

  console.log('Reasoning:', response.reasoning);
  console.log('\nExplication:', response.content);
}

// =============================================================================
// EXEMPLE 8 : Utilisation du helper statique
// =============================================================================

async function exemple8_HelperMethod() {
  console.log('\n=== EXEMPLE 8 : Helper statique ===\n');
  
  const xai = new XAIProvider();

  // Créer un message avec images en utilisant le helper
  const userMessage = XAIProvider.createMessageWithImages(
    'Que vois-tu dans ces images ?',
    [
      'https://example.com/img1.jpg',
      'https://example.com/img2.jpg'
    ],
    'auto'
  );

  console.log('Message créé:', JSON.stringify(userMessage, null, 2));

  // Utiliser directement dans callWithMessages
  const messages = [
    {
      role: 'system' as const,
      content: 'Tu es un assistant d\'analyse d\'images.'
    },
    userMessage
  ];

  const response = await xai.callWithMessages(messages, []);
  console.log('Réponse:', response.content);
}

// =============================================================================
// EXEMPLE 9 : Image quality settings (low vs high)
// =============================================================================

async function exemple9_QualitySettings() {
  console.log('\n=== EXEMPLE 9 : Comparaison qualité d\'image ===\n');
  
  const xai = new XAIProvider();
  const imageUrl = 'https://example.com/test-image.jpg';

  // Low detail = Plus rapide, moins cher
  console.log('📉 Test avec LOW detail...');
  const startLow = Date.now();
  const responseLow = await xai.callWithImages(
    'Décris cette image.',
    [{ url: imageUrl, detail: 'low' }]
  );
  const timeLow = Date.now() - startLow;
  console.log(`Temps: ${timeLow}ms`);
  console.log(`Réponse (low): ${responseLow.content?.substring(0, 100)}...`);

  // High detail = Plus lent, plus précis
  console.log('\n📈 Test avec HIGH detail...');
  const startHigh = Date.now();
  const responseHigh = await xai.callWithImages(
    'Décris cette image en détail.',
    [{ url: imageUrl, detail: 'high' }]
  );
  const timeHigh = Date.now() - startHigh;
  console.log(`Temps: ${timeHigh}ms`);
  console.log(`Réponse (high): ${responseHigh.content?.substring(0, 100)}...`);

  console.log(`\n⚡ Différence de temps: ${timeHigh - timeLow}ms`);
}

// =============================================================================
// EXEMPLE 10 : Cas d'usage réel - Analyse de facture
// =============================================================================

async function exemple10_InvoiceAnalysis() {
  console.log('\n=== EXEMPLE 10 : Analyse de facture ===\n');
  
  const xai = new XAIProvider({
    model: 'grok-4-fast',
    temperature: 0.3 // Basse température pour précision
  });

  const tools: Tool[] = [
    {
      type: 'function',
      function: {
        name: 'save_invoice_data',
        description: 'Sauvegarder les données extraites d\'une facture',
        parameters: {
          type: 'object',
          properties: {
            company_name: { type: 'string' },
            invoice_number: { type: 'string' },
            date: { type: 'string' },
            total_amount: { type: 'number' },
            currency: { type: 'string' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  description: { type: 'string' },
                  quantity: { type: 'number' },
                  price: { type: 'number' }
                }
              }
            }
          },
          required: ['company_name', 'invoice_number', 'total_amount']
        }
      }
    }
  ];

  const response = await xai.callWithImages(
    `Analyse cette facture et extrais toutes les informations importantes:
    - Nom de l'entreprise
    - Numéro de facture
    - Date
    - Montant total et devise
    - Liste des articles
    
    Utilise ensuite le tool pour sauvegarder ces données.`,
    [
      {
        url: 'https://example.com/invoice.pdf', // Peut aussi être une image de PDF
        detail: 'high'
      }
    ],
    {
      systemMessage: 'Tu es un expert en traitement de documents comptables.'
    },
    [],
    tools
  );

  console.log('Analyse:', response.content);
  console.log('Tool calls:', response.tool_calls);
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  EXEMPLES xAI GROK - SUPPORT DES IMAGES                 ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  try {
    // Exécuter les exemples (commenter ceux que vous ne voulez pas)
    
    // await exemple1_ImageURL();
    // await exemple2_ImageBase64();
    // await exemple3_MultipleImages();
    // await exemple4_ImageWithTools();
    // await exemple5_UIAnalysis();
    // await exemple6_OCR();
    // await exemple7_TechnicalDiagram();
    // await exemple8_HelperMethod();
    // await exemple9_QualitySettings();
    // await exemple10_InvoiceAnalysis();

    console.log('\n✅ Tous les exemples terminés !');
    
  } catch (error) {
    console.error('\n❌ Erreur:', error);
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  main();
}

// Export pour usage dans d'autres fichiers
export {
  exemple1_ImageURL,
  exemple2_ImageBase64,
  exemple3_MultipleImages,
  exemple4_ImageWithTools,
  exemple5_UIAnalysis,
  exemple6_OCR,
  exemple7_TechnicalDiagram,
  exemple8_HelperMethod,
  exemple9_QualitySettings,
  exemple10_InvoiceAnalysis
};

