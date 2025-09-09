#!/usr/bin/env node

/**
 * 🔄 Script de Migration vers le Système Realtime Unifié
 * 
 * Script pour migrer progressivement de l'ancien système RealtimeEditorService
 * vers le nouveau UnifiedRealtimeService.
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 Démarrage de la migration vers le système Realtime unifié...\n');

// Fichiers à migrer
const filesToMigrate = [
  'src/components/editor/Editor.tsx',
  'src/components/DossiersPage.tsx',
  'src/components/ClasseursPage.tsx',
  'src/app/editor/[noteId]/page.tsx'
];

// Patterns de remplacement
const replacements = [
  // Imports
  {
    from: /import { useRealtimeEditor } from '@/hooks\/RealtimeEditorHook';/g,
    to: "import { useUnifiedRealtime } from '@/hooks/useUnifiedRealtime';"
  },
  {
    from: /import { useDatabaseRealtime } from '@/hooks\/useDatabaseRealtime';/g,
    to: "import { useUnifiedRealtime } from '@/hooks/useUnifiedRealtime';"
  },
  {
    from: /import { RealtimeEditorDebug } from '@/components\/RealtimeEditorDebug';/g,
    to: "import { UnifiedRealtimeDebug } from '@/components/UnifiedRealtimeDebug';"
  },
  {
    from: /import RealtimeEditorManager from '@/components\/RealtimeEditorManager';/g,
    to: "import RealtimeMigration from '@/components/RealtimeMigration';"
  },
  
  // Hooks
  {
    from: /const realtimeEditor = useRealtimeEditor\(/g,
    to: "const unifiedRealtime = useUnifiedRealtime("
  },
  {
    from: /const databaseRealtime = useDatabaseRealtime\(/g,
    to: "const unifiedRealtime = useUnifiedRealtime("
  },
  
  // Composants
  {
    from: /<RealtimeEditorDebug/g,
    to: "<UnifiedRealtimeDebug"
  },
  {
    from: /<RealtimeEditorManager/g,
    to: "<RealtimeMigration"
  },
  
  // Propriétés des hooks
  {
    from: /realtimeEditor\./g,
    to: "unifiedRealtime."
  },
  {
    from: /databaseRealtime\./g,
    to: "unifiedRealtime."
  }
];

// Fonction pour migrer un fichier
function migrateFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Fichier non trouvé: ${filePath}`);
    return false;
  }

  console.log(`📝 Migration de: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let hasChanges = false;

  // Appliquer les remplacements
  replacements.forEach(({ from, to }) => {
    const newContent = content.replace(from, to);
    if (newContent !== content) {
      content = newContent;
      hasChanges = true;
    }
  });

  if (hasChanges) {
    // Créer une sauvegarde
    const backupPath = filePath + '.backup';
    fs.writeFileSync(backupPath, fs.readFileSync(filePath, 'utf8'));
    console.log(`💾 Sauvegarde créée: ${backupPath}`);

    // Écrire le fichier migré
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fichier migré: ${filePath}`);
    return true;
  } else {
    console.log(`⏭️  Aucun changement nécessaire: ${filePath}`);
    return false;
  }
}

// Fonction pour nettoyer les anciens fichiers
function cleanupOldFiles() {
  const oldFiles = [
    'src/services/RealtimeEditorService.ts',
    'src/services/DatabaseRealtimeService.ts',
    'src/hooks/RealtimeEditorHook.ts',
    'src/hooks/useDatabaseRealtime.ts',
    'src/components/RealtimeEditorManager.tsx',
    'src/components/RealtimeEditorDebug.tsx',
    'src/components/RealtimeEditorMonitor.tsx'
  ];

  console.log('\n🧹 Nettoyage des anciens fichiers...');
  
  oldFiles.forEach(file => {
    if (fs.existsSync(file)) {
      // Déplacer vers un dossier de sauvegarde
      const backupDir = 'backup/old-realtime-files';
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      const fileName = path.basename(file);
      const backupPath = path.join(backupDir, fileName);
      
      fs.renameSync(file, backupPath);
      console.log(`📦 Ancien fichier déplacé: ${file} → ${backupPath}`);
    }
  });
}

// Fonction pour créer un rapport de migration
function createMigrationReport(migratedFiles) {
  const report = {
    timestamp: new Date().toISOString(),
    migratedFiles,
    newFiles: [
      'src/services/UnifiedRealtimeService.ts',
      'src/hooks/useUnifiedRealtime.ts',
      'src/components/UnifiedRealtimeDebug.tsx',
      'src/components/RealtimeMigration.tsx',
      'src/utils/testUnifiedRealtime.ts'
    ],
    improvements: [
      'Architecture unifiée - Un seul service au lieu de deux',
      'Circuit breaker pour éviter les reconnexions en boucle',
      'Backoff exponentiel avec jitter pour éviter les reconnexions simultanées',
      'Gestion d\'erreurs robuste avec retry intelligent',
      'Monitoring de l\'authentification automatique',
      'Heartbeat optimisé (1 minute au lieu de 30 secondes)',
      'Gestion de visibilité améliorée',
      'Statistiques et monitoring avancés',
      'Tests complets et validation'
    ],
    breakingChanges: [
      'RealtimeEditorService et DatabaseRealtimeService supprimés',
      'useRealtimeEditor et useDatabaseRealtime remplacés par useUnifiedRealtime',
      'RealtimeEditorManager remplacé par RealtimeMigration',
      'API des hooks légèrement modifiée'
    ]
  };

  const reportPath = 'MIGRATION-REALTIME-UNIFIED-REPORT.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📊 Rapport de migration créé: ${reportPath}`);
}

// Exécution de la migration
async function runMigration() {
  try {
    const migratedFiles = [];

    // Migrer les fichiers
    console.log('🔄 Migration des fichiers...\n');
    filesToMigrate.forEach(file => {
      if (migrateFile(file)) {
        migratedFiles.push(file);
      }
    });

    // Nettoyer les anciens fichiers
    cleanupOldFiles();

    // Créer le rapport
    createMigrationReport(migratedFiles);

    console.log('\n✅ Migration terminée avec succès !');
    console.log('\n📋 Prochaines étapes:');
    console.log('1. Tester le nouveau système avec: npm run test:realtime');
    console.log('2. Vérifier que tous les composants fonctionnent correctement');
    console.log('3. Supprimer les fichiers de sauvegarde si tout fonctionne');
    console.log('4. Mettre à jour la documentation');

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  }
}

// Exécuter la migration
runMigration();
