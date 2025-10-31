/**
 * Script pour générer les icônes PWA badge avec plume
 * Usage: npx tsx scripts/generate-pwa-icons.ts
 */

import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SOURCE_LOGO = path.join(__dirname, '../public/feather.svg');
const OUTPUT_DIR = path.join(__dirname, '../public');

interface IconSize {
  name: string;
  size: number;
  logoSize: number;
}

const ICON_SIZES: IconSize[] = [
  { name: 'icon-192x192.png', size: 192, logoSize: 100 }, // Plume 50% de l'icône
  { name: 'icon-512x512.png', size: 512, logoSize: 260 }, // Plume 50% de l'icône
  { name: 'apple-touch-icon.png', size: 180, logoSize: 90 } // Plume 50% de l'icône
];

async function generateIcons(): Promise<void> {
  console.log('🎨 Génération des icônes PWA badge (plume)...\n');
  
  try {
    for (const icon of ICON_SIZES) {
      const outputPath = path.join(OUTPUT_DIR, icon.name);
      
      await sharp({
        create: {
          width: icon.size,
          height: icon.size,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 1 } // #000000
        }
      })
      .composite([{
        input: await sharp(SOURCE_LOGO)
          .resize(icon.logoSize, icon.logoSize, { fit: 'contain' })
          .toBuffer(),
        gravity: 'center'
      }])
      .png({ quality: 100 })
      .toFile(outputPath);
      
      console.log(`✅ ${icon.name} (${icon.size}x${icon.size}, plume ${icon.logoSize}x${icon.logoSize})`);
    }
    
    console.log('\n🎉 Icônes PWA badge générées avec plume !');
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

generateIcons();
