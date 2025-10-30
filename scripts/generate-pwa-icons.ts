/**
 * Script pour générer les icônes PWA
 * - icon-192x192.png
 * - icon-512x512.png
 * - apple-touch-icon.png (180x180)
 * 
 * Usage: npx tsx scripts/generate-pwa-icons.ts
 */

import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SOURCE_LOGO = path.join(__dirname, '../public/simple logo.svg');
const OUTPUT_DIR = path.join(__dirname, '../public');

interface IconSize {
  name: string;
  size: number;
}

const ICON_SIZES: IconSize[] = [
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 }
];

async function generateIcons(): Promise<void> {
  console.log('🎨 Génération des icônes PWA...\n');
  
  try {
    for (const icon of ICON_SIZES) {
      const outputPath = path.join(OUTPUT_DIR, icon.name);
      
      await sharp(SOURCE_LOGO)
        .resize(icon.size, icon.size, {
          fit: 'contain',
          background: { r: 19, g: 19, b: 19, alpha: 1 } // #131313
        })
        .png({ quality: 100 })
        .toFile(outputPath);
      
      console.log(`✅ ${icon.name} (${icon.size}x${icon.size})`);
    }
    
    console.log('\n🎉 Toutes les icônes PWA ont été générées avec succès !');
  } catch (error) {
    console.error('❌ Erreur lors de la génération des icônes:', error);
    process.exit(1);
  }
}

generateIcons();

