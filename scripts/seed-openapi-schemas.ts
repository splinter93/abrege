/**
 * Script pour insérer les schémas OpenAPI en base de données
 * 
 * Usage:
 *   npx tsx scripts/seed-openapi-schemas.ts
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

async function seedOpenAPISchemas() {
  console.log('🚀 Insertion des schémas OpenAPI en base de données...\n');

  try {
    // Lire le schéma OpenAPI Scrivia
    const schemaPath = path.join(__dirname, '../generate-complete-openapi.js');
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    const openApiSchema = JSON.parse(schemaContent);

    console.log('📄 Schéma OpenAPI chargé:', {
      title: openApiSchema.info?.title,
      version: openApiSchema.info?.version,
      pathsCount: Object.keys(openApiSchema.paths || {}).length,
      schemasCount: Object.keys(openApiSchema.components?.schemas || {}).length
    });

    // Vérifier si le schéma existe déjà
    const { data: existing, error: checkError } = await supabase
      .from('openapi_schemas')
      .select('id, name, version')
      .eq('name', 'scrivia-api-v2')
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Erreur lors de la vérification:', checkError);
      throw checkError;
    }

    if (existing) {
      console.log('✅ Schéma existant trouvé:', {
        id: existing.id,
        name: existing.name,
        version: existing.version
      });

      // Mettre à jour
      console.log('🔄 Mise à jour du schéma...');
      
      const { error: updateError } = await supabase
        .from('openapi_schemas')
        .update({
          content: openApiSchema,
          version: openApiSchema.info.version,
          description: openApiSchema.info.description,
          updated_at: new Date().toISOString(),
          tags: ['scrivia', 'notes', 'classeurs', 'agents'],
          status: 'active'
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('❌ Erreur lors de la mise à jour:', updateError);
        throw updateError;
      }

      console.log('✅ Schéma mis à jour avec succès!');

    } else {
      // Insérer un nouveau schéma
      console.log('➕ Insertion d\'un nouveau schéma...');
      
      const { data: inserted, error: insertError } = await supabase
        .from('openapi_schemas')
        .insert({
          name: 'scrivia-api-v2',
          description: openApiSchema.info.description,
          version: openApiSchema.info.version,
          content: openApiSchema,
          status: 'active',
          tags: ['scrivia', 'notes', 'classeurs', 'agents']
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Erreur lors de l\'insertion:', insertError);
        throw insertError;
      }

      console.log('✅ Schéma inséré avec succès:', {
        id: inserted.id,
        name: inserted.name,
        version: inserted.version
      });
    }

    // Statistiques finales
    const { data: allSchemas, error: countError } = await supabase
      .from('openapi_schemas')
      .select('id, name, version, status, tags');

    if (!countError && allSchemas) {
      console.log('\n📊 Schémas OpenAPI en base de données:', allSchemas.length);
      allSchemas.forEach(schema => {
        console.log(`  - ${schema.name} (v${schema.version}) [${schema.status}]`);
      });
    }

    console.log('\n✅ Seed terminé avec succès !');

  } catch (error) {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
  }
}

// Exécuter
seedOpenAPISchemas();

