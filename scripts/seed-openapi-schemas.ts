/**
 * Script pour insérer les schémas OpenAPI en base de données
 * 
 * Usage:
 *   npx tsx scripts/seed-openapi-schemas.ts
 *   npx tsx scripts/seed-openapi-schemas.ts --name clickup-api --file ./clickup-openapi.json
 *   npx tsx scripts/seed-openapi-schemas.ts --name hubspot-api --file ./hubspot-openapi.json
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Parser les arguments de ligne de commande
 */
function parseArgs(): { name?: string; file?: string } {
  const args = process.argv.slice(2);
  const parsed: { name?: string; file?: string } = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--name' && args[i + 1]) {
      parsed.name = args[i + 1];
      i++;
    } else if (args[i] === '--file' && args[i + 1]) {
      parsed.file = args[i + 1];
      i++;
    }
  }

  return parsed;
}

/**
 * Insérer ou mettre à jour un schéma
 */
async function upsertSchema(name: string, schemaPath: string): Promise<void> {
  console.log(`📄 Traitement du schéma: ${name}`);

  try {
    // Lire le fichier
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    const openApiSchema = JSON.parse(schemaContent);

    console.log('  - Info:', {
      title: openApiSchema.info?.title,
      version: openApiSchema.info?.version,
      pathsCount: Object.keys(openApiSchema.paths || {}).length,
      schemasCount: Object.keys(openApiSchema.components?.schemas || {}).length
    });

    // Vérifier si le schéma existe déjà
    const { data: existing, error: checkError } = await supabase
      .from('openapi_schemas')
      .select('id, name, version')
      .eq('name', name)
      .maybeSingle();

    if (checkError) {
      console.error('  ❌ Erreur lors de la vérification:', checkError);
      throw checkError;
    }

    if (existing) {
      console.log('  ✅ Schéma existant trouvé:', {
        id: existing.id,
        name: existing.name,
        version: existing.version
      });

      // Mettre à jour
      console.log('  🔄 Mise à jour du schéma...');
      
      const { error: updateError } = await supabase
        .from('openapi_schemas')
        .update({
          content: openApiSchema,
          version: openApiSchema.info?.version || existing.version,
          description: openApiSchema.info?.description || '',
          updated_at: new Date().toISOString(),
          status: 'active'
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('  ❌ Erreur lors de la mise à jour:', updateError);
        throw updateError;
      }

      console.log('  ✅ Schéma mis à jour avec succès!\n');

    } else {
      // Insérer un nouveau schéma
      console.log('  ➕ Insertion d\'un nouveau schéma...');
      
      // Détecter les tags depuis le schéma
      const tags = openApiSchema.tags?.map((t: any) => t.name) || [];
      
      const { data: inserted, error: insertError } = await supabase
        .from('openapi_schemas')
        .insert({
          name,
          description: openApiSchema.info?.description || '',
          version: openApiSchema.info?.version || '1.0.0',
          content: openApiSchema,
          status: 'active',
          tags
        })
        .select()
        .single();

      if (insertError) {
        console.error('  ❌ Erreur lors de l\'insertion:', insertError);
        throw insertError;
      }

      console.log('  ✅ Schéma inséré avec succès:', {
        id: inserted.id,
        name: inserted.name,
        version: inserted.version
      });
      console.log();
    }

  } catch (error) {
    console.error('  ❌ Erreur:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Seed des schémas OpenAPI\n');

  try {
    const args = parseArgs();

    if (args.name && args.file) {
      // Mode : seed d'un schéma spécifique
      const filePath = path.resolve(process.cwd(), args.file);
      
      if (!fs.existsSync(filePath)) {
        console.error(`❌ Fichier non trouvé: ${filePath}`);
        process.exit(1);
      }

      await upsertSchema(args.name, filePath);

    } else {
      // Mode par défaut : seed du schéma Scrivia
      console.log('📋 Mode par défaut: seed du schéma Scrivia\n');
      const schemaPath = path.join(__dirname, '../generate-complete-openapi.js');
      await upsertSchema('scrivia-api-v2', schemaPath);
    }

    // Statistiques finales
    const { data: allSchemas, error: countError } = await supabase
      .from('openapi_schemas')
      .select('id, name, version, status, tags');

    if (!countError && allSchemas) {
      console.log('📊 Schémas OpenAPI en base de données:', allSchemas.length);
      allSchemas.forEach(schema => {
        console.log(`  - ${schema.name} (v${schema.version}) [${schema.status}]`);
        if (schema.tags && schema.tags.length > 0) {
          console.log(`    Tags: ${schema.tags.join(', ')}`);
        }
      });
    }

    console.log('\n✅ Seed terminé avec succès !');

  } catch (error) {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
  }
}

// Exécuter
main();

