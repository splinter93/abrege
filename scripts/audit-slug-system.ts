#!/usr/bin/env node

/**
 * Script d'audit complet du système de slugs et URLs publiques
 * Vérifie l'intégrité et corrige automatiquement les problèmes
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

if (!apiBaseUrl) {
  console.error('❌ NEXT_PUBLIC_API_BASE_URL manquant');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface IntegrityReport {
  totalNotes: number;
  validSlugs: number;
  validUrls: number;
  issues: Array<{ noteId: string; issue: string; fix?: string }>;
}

interface UserCorrectionsResult {
  totalCorrected: number;
  usersProcessed: number;
  errors: Array<{ userId: string; username: string; error: string }>;
}

async function auditSlugSystem(): Promise<void> {
  console.log('🔍 Début de l\'audit du système de slugs et URLs...');
  console.log(`📡 API Base URL: ${apiBaseUrl}\n`);
  
  try {
    // 1. Vérifier l'intégrité générale du système
    console.log('📊 1. Vérification de l\'intégrité générale...');
    const integrityReport = await checkSystemIntegrity();
    displayIntegrityReport(integrityReport);

    // 2. Vérifier et corriger les URLs par utilisateur
    console.log('\n🔧 2. Correction des URLs par utilisateur...');
    const userCorrections = await correctAllUserUrls();
    displayUserCorrections(userCorrections);

    // 3. Vérification finale
    console.log('\n✅ 3. Vérification finale...');
    const finalReport = await checkSystemIntegrity();
    displayIntegrityReport(finalReport, 'FINAL');

    // 4. Résumé des actions
    console.log('\n📋 RÉSUMÉ DES ACTIONS:');
    console.log(`   🔧 URLs corrigées: ${userCorrections.totalCorrected}`);
    console.log(`   👥 Utilisateurs traités: ${userCorrections.usersProcessed}`);
    console.log(`   📝 Notes totales: ${integrityReport.totalNotes}`);
    console.log(`   ✅ Intégrité finale: ${finalReport.validSlugs}/${finalReport.totalNotes} slugs valides`);

  } catch (err) {
    console.error('❌ Erreur lors de l\'audit:', err);
  }
}

async function checkSystemIntegrity(): Promise<IntegrityReport> {
  const report: IntegrityReport = {
    totalNotes: 0,
    validSlugs: 0,
    validUrls: 0,
    issues: []
  };

  try {
    // Récupérer toutes les notes
    const { data: notes, error: fetchError } = await supabase
      .from('articles')
      .select(`
        id,
        slug,
        source_title,
        public_url,
        user_id
      `);

    // Récupérer tous les utilisateurs séparément
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username');

    if (usersError) {
      throw new Error(`Erreur lors de la récupération des utilisateurs: ${usersError.message}`);
    }

    // Créer un map des utilisateurs
    const userMap = new Map(users?.map(u => [u.id, u.username]) || []);

    if (fetchError) {
      throw new Error(`Erreur lors de la récupération des notes: ${fetchError.message}`);
    }

    report.totalNotes = notes?.length || 0;

        if (notes) {
      for (const note of notes) {
        const username = userMap.get(note.user_id);
        
        if (!username) {
          report.issues.push({
            noteId: note.id,
            issue: 'Username introuvable',
            fix: 'Vérifier la relation utilisateur'
          });
          continue;
        }
        
        // Vérifier le slug
        if (!note.slug) {
          report.issues.push({
            noteId: note.id,
            issue: 'Slug manquant',
            fix: 'Générer un slug basé sur le titre'
          });
        } else {
          report.validSlugs++;
        }

        // Vérifier l'URL publique
        if (note.public_url) {
          const expectedUrl = `${apiBaseUrl}/@${username}/${note.slug}`;
          if (note.public_url === expectedUrl) {
            report.validUrls++;
          } else {
            report.issues.push({
              noteId: note.id,
              issue: `URL publique incorrecte: ${note.public_url}`,
              fix: `Corriger vers: ${expectedUrl}`
            });
          }
        } else {
          report.issues.push({
            noteId: note.id,
            issue: 'URL publique manquante',
            fix: `Générer: ${apiBaseUrl}/@${username}/${note.slug}`
          });
        }
      }
    }

    return report;
  } catch (error) {
    console.error('❌ Erreur dans checkSystemIntegrity:', error);
    throw error;
  }
}

async function correctAllUserUrls(): Promise<UserCorrectionsResult> {
  const result: UserCorrectionsResult = {
    totalCorrected: 0,
    usersProcessed: 0,
    errors: []
  };

  try {
    // Récupérer tous les utilisateurs
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username');

    if (usersError) {
      throw new Error(`Erreur lors de la récupération des utilisateurs: ${usersError.message}`);
    }

    if (users) {
      for (const user of users) {
        try {
          console.log(`🔧 Traitement de l'utilisateur: ${user.username}`);
          
          const correctedCount = await correctUserUrls(user.id, user.username);
          result.totalCorrected += correctedCount;
          result.usersProcessed++;
          
          if (correctedCount > 0) {
            console.log(`   ✅ ${correctedCount} URLs corrigées`);
          } else {
            console.log(`   ✅ Aucune correction nécessaire`);
          }
        } catch (error: any) {
          console.error(`   ❌ Erreur pour l'utilisateur ${user.username}:`, error.message);
          result.errors.push({ userId: user.id, username: user.username, error: error.message });
        }
      }
    }

    return result;
  } catch (error: any) {
    console.error('❌ Erreur dans correctAllUserUrls:', error);
    throw error;
  }
}

async function correctUserUrls(userId: string, username: string): Promise<number> {
  let correctedCount = 0;

  try {
    // Récupérer toutes les notes de l'utilisateur
    const { data: notes, error: fetchError } = await supabase
      .from('articles')
      .select('id, slug, source_title, public_url')
      .eq('user_id', userId);

    if (fetchError) {
      throw new Error(`Erreur lors de la récupération des notes: ${fetchError.message}`);
    }

    if (notes) {
      for (const note of notes) {
        if (!note.slug) {
          // Générer un slug si manquant
          const newSlug = await generateSlugForNote(note.source_title, userId, note.id);
          if (newSlug) {
            correctedCount++;
          }
          continue;
        }

        const expectedUrl = `${apiBaseUrl}/@${username}/${note.slug}`;
        
        // Vérifier si l'URL publique est correcte
        if (note.public_url !== expectedUrl) {
          const { error: updateError } = await supabase
            .from('articles')
            .update({ public_url: expectedUrl })
            .eq('id', note.id)
            .eq('user_id', userId);

          if (updateError) {
            console.error(`   ❌ Erreur mise à jour note ${note.id}:`, updateError.message);
          } else {
            correctedCount++;
          }
        }
      }
    }

    return correctedCount;
  } catch (error: any) {
    console.error(`❌ Erreur dans correctUserUrls pour ${username}:`, error);
    throw error;
  }
}

async function generateSlugForNote(title: string, userId: string, noteId: string): Promise<string | null> {
  try {
    // Génération simple de slug
    const baseSlug = title
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 120);

    let candidateSlug = baseSlug;
    let counter = 1;
    
    // Vérifier l'unicité
    while (true) {
      const { data: existing } = await supabase
        .from('articles')
        .select('id')
        .eq('slug', candidateSlug)
        .eq('user_id', userId);

      if (!existing || existing.length === 0) {
        break;
      }
      
      counter++;
      candidateSlug = `${baseSlug}-${counter}`;
    }

    // Mettre à jour la note avec le nouveau slug
    const { error: updateError } = await supabase
      .from('articles')
      .update({ 
        slug: candidateSlug,
        updated_at: new Date().toISOString()
      })
      .eq('id', noteId)
      .eq('user_id', userId);

    if (updateError) {
      console.error(`   ❌ Erreur mise à jour slug note ${noteId}:`, updateError.message);
      return null;
    }

    return candidateSlug;
  } catch (error: any) {
    console.error(`❌ Erreur génération slug pour note ${noteId}:`, error);
    return null;
  }
}

function displayIntegrityReport(report: IntegrityReport, phase: string = 'INITIAL'): void {
  console.log(`\n📊 RAPPORT D'INTÉGRITÉ (${phase}):`);
  console.log(`   📝 Notes totales: ${report.totalNotes}`);
  console.log(`   ✅ Slugs valides: ${report.validSlugs}/${report.totalNotes}`);
  console.log(`   ✅ URLs valides: ${report.validUrls}/${report.totalNotes}`);
  
  if (report.issues.length > 0) {
    console.log(`   ⚠️  Problèmes détectés: ${report.issues.length}`);
    report.issues.slice(0, 5).forEach(issue => {
      console.log(`      - ${issue.issue} (${issue.noteId})`);
    });
    if (report.issues.length > 5) {
      console.log(`      ... et ${report.issues.length - 5} autres problèmes`);
    }
  } else {
    console.log(`   🎉 Aucun problème détecté !`);
  }
}

function displayUserCorrections(result: UserCorrectionsResult): void {
  console.log(`\n🔧 RÉSULTATS DES CORRECTIONS:`);
  console.log(`   👥 Utilisateurs traités: ${result.usersProcessed}`);
  console.log(`   ✅ URLs corrigées: ${result.totalCorrected}`);
  
  if (result.errors.length > 0) {
    console.log(`   ❌ Erreurs rencontrées: ${result.errors.length}`);
    result.errors.forEach(error => {
      console.log(`      - ${error.username}: ${error.error}`);
    });
  }
}

// Exécuter l'audit
auditSlugSystem()
  .then(() => {
    console.log('\n🎉 Audit terminé avec succès !');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n💥 Erreur fatale lors de l\'audit:', err);
    process.exit(1);
  }); 