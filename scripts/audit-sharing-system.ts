#!/usr/bin/env tsx

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Charger les variables d'environnement
config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface AuditReport {
  databaseStructure: {
    hasSlugColumn: boolean;
    hasShareSettingsColumn: boolean;
    hasVisibilityColumn: boolean;
    hasNotebookIdColumn: boolean;
    hasClasseurIdColumn: boolean;
  };
  dataIntegrity: {
    totalArticles: number;
    articlesWithSlugs: number;
    articlesWithoutSlugs: number;
    articlesWithShareSettings: number;
    articlesWithVisibility: number;
    articlesWithNotebookId: number;
    articlesWithClasseurId: number;
  };
  sharingConfiguration: {
    privateNotes: number;
    publicNotes: number;
    linkNotes: number;
    limitedNotes: number;
    scriviaNotes: number;
  };
  userData: {
    totalUsers: number;
    usersWithUsername: number;
    usersWithoutUsername: number;
  };
  publicAccess: {
    publicNotesCount: number;
    publicNotesWithValidSlugs: number;
    publicNotesWithValidUsernames: number;
  };
  errors: string[];
}

async function auditDatabaseStructure(): Promise<AuditReport['databaseStructure']> {
  console.log('🔍 Vérification de la structure de la base de données...');
  
  try {
    // Vérifier la colonne slug
    const { data: slugTest, error: slugError } = await supabase
      .from('articles')
      .select('slug')
      .limit(1);
    
    const hasSlugColumn = !slugError;
    
    // Vérifier la colonne share_settings
    const { data: shareTest, error: shareError } = await supabase
      .from('articles')
      .select('share_settings')
      .limit(1);
    
    const hasShareSettingsColumn = !shareError;
    
    // Vérifier la colonne visibility
    const { data: visibilityTest, error: visibilityError } = await supabase
      .from('articles')
      .select('visibility')
      .limit(1);
    
    const hasVisibilityColumn = !visibilityError;
    
    // Vérifier la colonne notebook_id
    const { data: notebookTest, error: notebookError } = await supabase
      .from('articles')
      .select('notebook_id')
      .limit(1);
    
    const hasNotebookIdColumn = !notebookError;
    
    // Vérifier la colonne classeur_id
    const { data: classeurTest, error: classeurError } = await supabase
      .from('articles')
      .select('classeur_id')
      .limit(1);
    
    const hasClasseurIdColumn = !classeurError;
    
    return {
      hasSlugColumn,
      hasShareSettingsColumn,
      hasVisibilityColumn,
      hasNotebookIdColumn,
      hasClasseurIdColumn
    };
  } catch (error) {
    console.error('❌ Erreur lors de la vérification de la structure:', error);
    return {
      hasSlugColumn: false,
      hasShareSettingsColumn: false,
      hasVisibilityColumn: false,
      hasNotebookIdColumn: false,
      hasClasseurIdColumn: false
    };
  }
}

async function auditDataIntegrity(): Promise<AuditReport['dataIntegrity']> {
  console.log('📊 Vérification de l\'intégrité des données...');
  
  try {
    // Compter le total des articles
    const { count: totalArticles, error: totalError } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true });
    
    if (totalError) throw totalError;
    
    // Compter les articles avec slugs
    const { count: articlesWithSlugs, error: slugError } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true })
      .not('slug', 'is', null);
    
    if (slugError) throw slugError;
    
    // Compter les articles avec share_settings
    const { count: articlesWithShareSettings, error: shareError } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true })
      .not('share_settings', 'is', null);
    
    if (shareError) throw shareError;
    
    // Compter les articles avec visibility
    const { count: articlesWithVisibility, error: visibilityError } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true })
      .not('visibility', 'is', null);
    
    if (visibilityError) throw visibilityError;
    
    // Compter les articles avec notebook_id
    const { count: articlesWithNotebookId, error: notebookError } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true })
      .not('notebook_id', 'is', null);
    
    if (notebookError) throw notebookError;
    
    // Compter les articles avec classeur_id
    const { count: articlesWithClasseurId, error: classeurError } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true })
      .not('classeur_id', 'is', null);
    
    if (classeurError) throw classeurError;
    
    return {
      totalArticles: totalArticles || 0,
      articlesWithSlugs: articlesWithSlugs || 0,
      articlesWithoutSlugs: (totalArticles || 0) - (articlesWithSlugs || 0),
      articlesWithShareSettings: articlesWithShareSettings || 0,
      articlesWithVisibility: articlesWithVisibility || 0,
      articlesWithNotebookId: articlesWithNotebookId || 0,
      articlesWithClasseurId: articlesWithClasseurId || 0
    };
  } catch (error) {
    console.error('❌ Erreur lors de la vérification de l\'intégrité:', error);
    return {
      totalArticles: 0,
      articlesWithSlugs: 0,
      articlesWithoutSlugs: 0,
      articlesWithShareSettings: 0,
      articlesWithVisibility: 0,
      articlesWithNotebookId: 0,
      articlesWithClasseurId: 0
    };
  }
}

async function auditSharingConfiguration(): Promise<AuditReport['sharingConfiguration']> {
  console.log('🔐 Vérification de la configuration du partage...');
  
  try {
    // Compter par type de visibilité dans share_settings
    const { data: shareSettingsData, error: shareError } = await supabase
      .from('articles')
      .select('share_settings')
      .not('share_settings', 'is', null);
    
    if (shareError) throw shareError;
    
    let privateNotes = 0;
    let publicNotes = 0;
    let linkNotes = 0;
    let limitedNotes = 0;
    let scriviaNotes = 0;
    
    shareSettingsData?.forEach(article => {
      const visibility = article.share_settings?.visibility;
      switch (visibility) {
        case 'private':
          privateNotes++;
          break;
        case 'link-public':
          publicNotes++;
          break;
        case 'link-private':
          linkNotes++;
          break;
        case 'limited':
          limitedNotes++;
          break;
        case 'scrivia':
          scriviaNotes++;
          break;
        default:
          privateNotes++; // Par défaut
      }
    });
    
    return {
      privateNotes,
      publicNotes,
      linkNotes,
      limitedNotes,
      scriviaNotes
    };
  } catch (error) {
    console.error('❌ Erreur lors de la vérification du partage:', error);
    return {
      privateNotes: 0,
      publicNotes: 0,
      linkNotes: 0,
      limitedNotes: 0,
      scriviaNotes: 0
    };
  }
}

async function auditUserData(): Promise<AuditReport['userData']> {
  console.log('👥 Vérification des données utilisateurs...');
  
  try {
    // Compter le total des utilisateurs
    const { count: totalUsers, error: totalError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    if (totalError) throw totalError;
    
    // Compter les utilisateurs avec username
    const { count: usersWithUsername, error: usernameError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .not('username', 'is', null);
    
    if (usernameError) throw usernameError;
    
    return {
      totalUsers: totalUsers || 0,
      usersWithUsername: usersWithUsername || 0,
      usersWithoutUsername: (totalUsers || 0) - (usersWithUsername || 0)
    };
  } catch (error) {
    console.error('❌ Erreur lors de la vérification des utilisateurs:', error);
    return {
      totalUsers: 0,
      usersWithUsername: 0,
      usersWithoutUsername: 0
    };
  }
}

async function auditPublicAccess(): Promise<AuditReport['publicAccess']> {
  console.log('🌐 Vérification de l\'accès public...');
  
  try {
    // Compter les notes publiques
    const { data: publicNotes, error: publicError } = await supabase
      .from('articles')
      .select('id, slug, user_id, share_settings')
      .not('share_settings->>visibility', 'eq', 'private');
    
    if (publicError) throw publicError;
    
    const publicNotesCount = publicNotes?.length || 0;
    
    // Vérifier les notes publiques avec des slugs valides
    const publicNotesWithValidSlugs = publicNotes?.filter(note => 
      note.slug && note.slug.trim().length > 0
    ).length || 0;
    
    // Vérifier les notes publiques avec des utilisateurs valides
    const publicNotesWithValidUsernames = publicNotes?.filter(note => 
      note.user_id
    ).length || 0;
    
    return {
      publicNotesCount,
      publicNotesWithValidSlugs,
      publicNotesWithValidUsernames
    };
  } catch (error) {
    console.error('❌ Erreur lors de la vérification de l\'accès public:', error);
    return {
      publicNotesCount: 0,
      publicNotesWithValidSlugs: 0,
      publicNotesWithValidUsernames: 0
    };
  }
}

async function testPublicNoteAccess(): Promise<void> {
  console.log('\n🧪 Test d\'accès aux notes publiques...');
  
  try {
    // Récupérer une note publique pour tester
    const { data: publicNote, error: noteError } = await supabase
      .from('articles')
      .select('id, slug, user_id, share_settings')
      .not('share_settings->>visibility', 'eq', 'private')
      .not('slug', 'is', null)
      .limit(1)
      .single();
    
    if (noteError || !publicNote) {
      console.log('❌ Aucune note publique trouvée pour le test');
      return;
    }
    
    // Récupérer l'utilisateur
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('username')
      .eq('id', publicNote.user_id)
      .single();
    
    if (userError || !user) {
      console.log('❌ Utilisateur non trouvé pour la note de test');
      return;
    }
    
    console.log(`✅ Note de test trouvée:`);
    console.log(`   - ID: ${publicNote.id}`);
    console.log(`   - Slug: ${publicNote.slug}`);
    console.log(`   - Username: ${user.username}`);
    console.log(`   - Visibilité: ${publicNote.share_settings?.visibility}`);
    
    // Tester l'URL publique
    const publicUrl = `/${user.username}/${publicNote.slug}`;
    console.log(`   - URL publique: ${publicUrl}`);
    
  } catch (error) {
    console.error('❌ Erreur lors du test d\'accès:', error);
  }
}

async function generateSlugsForMissingNotes(): Promise<void> {
  console.log('\n🔧 Génération des slugs manquants...');
  
  try {
    // Récupérer les notes sans slug
    const { data: notesWithoutSlugs, error: fetchError } = await supabase
      .from('articles')
      .select('id, source_title, user_id')
      .is('slug', null)
      .limit(10); // Limiter pour éviter de surcharger
    
    if (fetchError) throw fetchError;
    
    if (!notesWithoutSlugs || notesWithoutSlugs.length === 0) {
      console.log('✅ Toutes les notes ont déjà des slugs');
      return;
    }
    
    console.log(`📝 ${notesWithoutSlugs.length} notes sans slug trouvées`);
    
    for (const note of notesWithoutSlugs) {
      try {
        // Générer un slug simple
        const slug = note.source_title
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9\s-]/g, '')
          .trim()
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .slice(0, 100);
        
        // Vérifier l'unicité
        const { data: existing } = await supabase
          .from('articles')
          .select('id')
          .eq('slug', slug)
          .eq('user_id', note.user_id);
        
        let finalSlug = slug;
        let counter = 1;
        
        while (existing && existing.length > 0) {
          finalSlug = `${slug}-${counter}`;
          const { data: existingCheck } = await supabase
            .from('articles')
            .select('id')
            .eq('slug', finalSlug)
            .eq('user_id', note.user_id);
          
          if (!existingCheck || existingCheck.length === 0) break;
          counter++;
        }
        
        // Mettre à jour la note
        const { error: updateError } = await supabase
          .from('articles')
          .update({ 
            slug: finalSlug,
            updated_at: new Date().toISOString()
          })
          .eq('id', note.id);
        
        if (updateError) {
          console.error(`   ❌ Erreur mise à jour note ${note.id}:`, updateError.message);
        } else {
          console.log(`   ✅ Slug généré: "${note.source_title}" -> "${finalSlug}"`);
        }
        
      } catch (error) {
        console.error(`   ❌ Erreur pour note ${note.id}:`, error);
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la génération des slugs:', error);
  }
}

async function main(): Promise<void> {
  console.log('🚀 AUDIT COMPLET DU SYSTÈME DE PARTAGE SCRIVIA');
  console.log('================================================\n');
  
  try {
    // 1. Audit de la structure
    const structure = await auditDatabaseStructure();
    
    // 2. Audit de l'intégrité des données
    const integrity = await auditDataIntegrity();
    
    // 3. Audit de la configuration du partage
    const sharing = await auditSharingConfiguration();
    
    // 4. Audit des données utilisateurs
    const users = await auditUserData();
    
    // 5. Audit de l'accès public
    const publicAccess = await auditPublicAccess();
    
    // 6. Test d'accès aux notes publiques
    await testPublicNoteAccess();
    
    // 7. Génération des slugs manquants
    await generateSlugsForMissingNotes();
    
    // 8. Rapport final
    console.log('\n📋 RAPPORT D\'AUDIT COMPLET');
    console.log('=============================');
    
    console.log('\n🏗️  STRUCTURE DE LA BASE DE DONNÉES:');
    console.log(`   ✅ Colonne slug: ${structure.hasSlugColumn ? 'OUI' : '❌ NON'}`);
    console.log(`   ✅ Colonne share_settings: ${structure.hasShareSettingsColumn ? 'OUI' : '❌ NON'}`);
    console.log(`   ✅ Colonne visibility: ${structure.hasVisibilityColumn ? 'OUI' : '❌ NON'}`);
    console.log(`   ✅ Colonne notebook_id: ${structure.hasNotebookIdColumn ? 'OUI' : '❌ NON'}`);
    console.log(`   ✅ Colonne classeur_id: ${structure.hasClasseurIdColumn ? 'OUI' : '❌ NON'}`);
    
    console.log('\n📊 INTÉGRITÉ DES DONNÉES:');
    console.log(`   📝 Total articles: ${integrity.totalArticles}`);
    console.log(`   🔗 Articles avec slugs: ${integrity.articlesWithSlugs} (${Math.round((integrity.articlesWithSlugs / integrity.totalArticles) * 100)}%)`);
    console.log(`   ❌ Articles sans slugs: ${integrity.articlesWithoutSlugs}`);
    console.log(`   ⚙️  Articles avec share_settings: ${integrity.articlesWithShareSettings}`);
    console.log(`   👁️  Articles avec visibility: ${integrity.articlesWithVisibility}`);
    console.log(`   📚 Articles avec notebook_id: ${integrity.articlesWithNotebookId}`);
    console.log(`   📁 Articles avec classeur_id: ${integrity.articlesWithClasseurId}`);
    
    console.log('\n🔐 CONFIGURATION DU PARTAGE:');
    console.log(`   🔒 Notes privées: ${sharing.privateNotes}`);
    console.log(`   🌐 Notes publiques: ${sharing.publicNotes}`);
    console.log(`   🔗 Notes avec lien: ${sharing.linkNotes}`);
    console.log(`   👥 Notes limitées: ${sharing.limitedNotes}`);
    console.log(`   🎯 Notes Scrivia: ${sharing.scriviaNotes}`);
    
    console.log('\n👥 DONNÉES UTILISATEURS:');
    console.log(`   👤 Total utilisateurs: ${users.totalUsers}`);
    console.log(`   ✅ Utilisateurs avec username: ${users.usersWithUsername}`);
    console.log(`   ❌ Utilisateurs sans username: ${users.usersWithoutUsername}`);
    
    console.log('\n🌐 ACCÈS PUBLIC:');
    console.log(`   📄 Notes publiques totales: ${publicAccess.publicNotesCount}`);
    console.log(`   🔗 Notes publiques avec slugs valides: ${publicAccess.publicNotesWithValidSlugs}`);
    console.log(`   👤 Notes publiques avec utilisateurs valides: ${publicAccess.publicNotesWithValidUsernames}`);
    
    // 9. Recommandations
    console.log('\n💡 RECOMMANDATIONS:');
    
    if (!structure.hasSlugColumn) {
      console.log('   🚨 CRITIQUE: Ajouter la colonne slug à la table articles');
    }
    
    if (!structure.hasShareSettingsColumn) {
      console.log('   🚨 CRITIQUE: Ajouter la colonne share_settings à la table articles');
    }
    
    if (integrity.articlesWithoutSlugs > 0) {
      console.log(`   ⚠️  IMPORTANT: ${integrity.articlesWithoutSlugs} notes n'ont pas de slug`);
    }
    
    if (users.usersWithoutUsername > 0) {
      console.log(`   ⚠️  IMPORTANT: ${users.usersWithoutUsername} utilisateurs n'ont pas de username`);
    }
    
    if (publicAccess.publicNotesCount === 0) {
      console.log('   ⚠️  ATTENTION: Aucune note n\'est configurée comme publique');
    }
    
    console.log('\n✅ Audit terminé avec succès!');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'audit:', error);
  }
}

// Exécuter l'audit
main().catch(console.error); 