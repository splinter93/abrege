import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Créer le client Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🗑️ Début de la purge automatique de la corbeille')

    // Calculer la date limite (30 jours)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const cutoffDate = thirtyDaysAgo.toISOString()

    console.log(`📅 Purge des éléments antérieurs à: ${cutoffDate}`)

    // Supprimer les articles en corbeille depuis plus de 30 jours
    const { data: deletedArticles, error: articlesError } = await supabase
      .from('articles')
      .delete()
      .eq('is_in_trash', true)
      .lt('trashed_at', cutoffDate)
      .select('id')

    if (articlesError) {
      console.error('❌ Erreur purge articles:', articlesError)
      throw new Error(`Erreur purge articles: ${articlesError.message}`)
    }

    // Supprimer les dossiers en corbeille depuis plus de 30 jours
    const { data: deletedFolders, error: foldersError } = await supabase
      .from('folders')
      .delete()
      .eq('is_in_trash', true)
      .lt('trashed_at', cutoffDate)
      .select('id')

    if (foldersError) {
      console.error('❌ Erreur purge dossiers:', foldersError)
      throw new Error(`Erreur purge dossiers: ${foldersError.message}`)
    }

    // Supprimer les classeurs en corbeille depuis plus de 30 jours
    const { data: deletedClasseurs, error: classeursError } = await supabase
      .from('classeurs')
      .delete()
      .eq('is_in_trash', true)
      .lt('trashed_at', cutoffDate)
      .select('id')

    if (classeursError) {
      console.error('❌ Erreur purge classeurs:', classeursError)
      throw new Error(`Erreur purge classeurs: ${classeursError.message}`)
    }

    // Supprimer les fichiers en corbeille depuis plus de 30 jours
    const { data: deletedFiles, error: filesError } = await supabase
      .from('files')
      .delete()
      .eq('is_deleted', true)
      .lt('deleted_at', cutoffDate)
      .select('id')

    if (filesError) {
      console.error('❌ Erreur purge fichiers:', filesError)
      throw new Error(`Erreur purge fichiers: ${filesError.message}`)
    }

    // Calculer les statistiques
    const deletedItems = {
      articles: deletedArticles?.length || 0,
      folders: deletedFolders?.length || 0,
      classeurs: deletedClasseurs?.length || 0,
      files: deletedFiles?.length || 0,
      total: (deletedArticles?.length || 0) + 
             (deletedFolders?.length || 0) + 
             (deletedClasseurs?.length || 0) + 
             (deletedFiles?.length || 0)
    }

    console.log(`✅ Purge terminée: ${deletedItems.total} éléments supprimés`)
    console.log(`📊 Détail: ${deletedItems.articles} articles, ${deletedItems.folders} dossiers, ${deletedItems.classeurs} classeurs, ${deletedItems.files} fichiers`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Purge automatique terminée. ${deletedItems.total} éléments supprimés.`,
        data: {
          deleted_items: deletedItems,
          cutoff_date: cutoffDate,
          executed_at: new Date().toISOString()
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('❌ Erreur purge automatique:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Erreur lors de la purge automatique',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
