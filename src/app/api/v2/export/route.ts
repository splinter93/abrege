import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { getAuthenticatedUser } from '@/utils/authUtils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_export_data',
    component: 'API_V2',
    clientType
  };

  logApi.info('🚀 Début export données v2', context);

  // 🔐 Authentification
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi.info(`❌ Authentification échouée: ${authResult.error}`, context);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const userId = authResult.userId!;

  try {
    // Récupérer le corps de la requête
    const body = await request.json();
    const { format, classeur_id, include_metadata = true } = body;

    // Validation du format
    if (!format || !['markdown', 'json', 'html'].includes(format)) {
      logApi.info('❌ Format d\'export invalide', context);
      return NextResponse.json(
        { error: 'Format d\'export non supporté' },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Créer un client Supabase standard
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Construire la requête pour récupérer les données
    let notesQuery = supabase
      .from('articles')
      .select('id, source_title, slug, markdown_content, created_at, updated_at, is_published, folder_id, classeur_id')
      .eq('user_id', userId);

    if (classeur_id) {
      notesQuery = notesQuery.eq('classeur_id', classeur_id);
    }

    const { data: notes, error: notesError } = await notesQuery.order('created_at', { ascending: true });

    if (notesError) {
      logApi.info(`❌ Erreur récupération notes: ${notesError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des données' },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Récupérer les informations sur les classeurs et dossiers si les métadonnées sont demandées
    let classeurs: any[] = [];
    let folders: any[] = [];

    if (include_metadata) {
      if (classeur_id) {
        const { data: classeurData } = await supabase
          .from('classeurs')
          .select('*')
          .eq('id', classeur_id)
          .single();
        if (classeurData) classeurs = [classeurData];
      } else {
        const { data: classeursData } = await supabase
          .from('classeurs')
          .select('*')
          .eq('user_id', userId);
        classeurs = classeursData || [];
      }

      const { data: foldersData } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', userId);
      folders = foldersData || [];
    }

    // Générer l'export selon le format demandé
    let exportContent: string;
    let contentType: string;
    let filename: string;

    switch (format) {
      case 'markdown':
        exportContent = generateMarkdownExport(notes, classeurs, folders, include_metadata);
        contentType = 'text/markdown';
        filename = `scrivia-export-${new Date().toISOString().split('T')[0]}.md`;
        break;

      case 'json':
        exportContent = generateJsonExport(notes, classeurs, folders, include_metadata);
        contentType = 'application/json';
        filename = `scrivia-export-${new Date().toISOString().split('T')[0]}.json`;
        break;

      case 'html':
        exportContent = generateHtmlExport(notes, classeurs, folders, include_metadata);
        contentType = 'text/html';
        filename = `scrivia-export-${new Date().toISOString().split('T')[0]}.html`;
        break;

      default:
        throw new Error('Format non supporté');
    }

    // Générer un lien de téléchargement temporaire (simulation)
    const exportUrl = `/api/v2/export/download/${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Export ${format} généré en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      export_url: exportUrl,
      expires_at: expiresAt,
      format,
      filename,
      content_size: exportContent.length
    });

  } catch (err: unknown) {
    const error = err as Error;
    logApi.info(`❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// Fonction de génération d'export Markdown
function generateMarkdownExport(notes: any[], classeurs: any[], folders: any[], includeMetadata: boolean): string {
  let content = '# Export Scrivia\n\n';
  
  if (includeMetadata) {
    content += `## Métadonnées\n\n`;
    content += `- **Date d'export :** ${new Date().toISOString()}\n`;
    content += `- **Nombre de notes :** ${notes.length}\n`;
    content += `- **Nombre de classeurs :** ${classeurs.length}\n`;
    content += `- **Nombre de dossiers :** ${folders.length}\n\n`;
  }

  content += `## Notes\n\n`;

  notes.forEach((note, index) => {
    content += `### ${index + 1}. ${note.source_title}\n\n`;
    if (includeMetadata) {
      content += `- **ID :** ${note.id}\n`;
      content += `- **Slug :** ${note.slug}\n`;
      content += `- **Créé le :** ${note.created_at}\n`;
      content += `- **Modifié le :** ${note.updated_at}\n`;
      content += `- **Publié :** ${note.is_published ? 'Oui' : 'Non'}\n\n`;
    }
    content += `${note.markdown_content}\n\n`;
    content += `---\n\n`;
  });

  return content;
}

// Fonction de génération d'export JSON
function generateJsonExport(notes: any[], classeurs: any[], folders: any[], includeMetadata: boolean): string {
  const exportData = {
    export_info: {
      date: new Date().toISOString(),
      format: 'json',
      version: '2.0'
    },
    metadata: includeMetadata ? {
      total_notes: notes.length,
      total_classeurs: classeurs.length,
      total_folders: folders.length
    } : undefined,
    notes: notes.map(note => ({
      id: note.id,
      title: note.source_title,
      slug: note.slug,
      content: note.markdown_content,
      created_at: note.created_at,
      updated_at: note.updated_at,
      is_published: note.is_published,
      folder_id: note.folder_id,
      classeur_id: note.classeur_id
    })),
    classeurs: includeMetadata ? classeurs : undefined,
    folders: includeMetadata ? folders : undefined
  };

  return JSON.stringify(exportData, null, 2);
}

// Fonction de génération d'export HTML
function generateHtmlExport(notes: any[], classeurs: any[], folders: any[], includeMetadata: boolean): string {
  let content = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Export Scrivia</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; margin: 2rem; }
        .note { margin-bottom: 2rem; padding: 1rem; border: 1px solid #e1e5e9; border-radius: 8px; }
        .metadata { background: #f8f9fa; padding: 1rem; border-radius: 4px; margin-bottom: 1rem; }
        .metadata-item { margin: 0.5rem 0; }
        .content { white-space: pre-wrap; }
        h1 { color: #2c3e50; }
        h2 { color: #34495e; border-bottom: 2px solid #3498db; padding-bottom: 0.5rem; }
        h3 { color: #7f8c8d; }
    </style>
</head>
<body>
    <h1>Export Scrivia</h1>`;

  if (includeMetadata) {
    content += `
    <div class="metadata">
        <h2>Métadonnées</h2>
        <div class="metadata-item"><strong>Date d'export :</strong> ${new Date().toISOString()}</div>
        <div class="metadata-item"><strong>Nombre de notes :</strong> ${notes.length}</div>
        <div class="metadata-item"><strong>Nombre de classeurs :</strong> ${classeurs.length}</div>
        <div class="metadata-item"><strong>Nombre de dossiers :</strong> ${folders.length}</div>
    </div>`;
  }

  content += `
    <h2>Notes</h2>`;

  notes.forEach((note, index) => {
    content += `
    <div class="note">
        <h3>${index + 1}. ${note.source_title}</h3>`;
    
    if (includeMetadata) {
      content += `
        <div class="metadata">
            <div class="metadata-item"><strong>ID :</strong> ${note.id}</div>
            <div class="metadata-item"><strong>Slug :</strong> ${note.slug}</div>
            <div class="metadata-item"><strong>Créé le :</strong> ${note.created_at}</div>
            <div class="metadata-item"><strong>Modifié le :</strong> ${note.updated_at}</div>
            <div class="metadata-item"><strong>Publié :</strong> ${note.is_published ? 'Oui' : 'Non'}</div>
        </div>`;
    }

    content += `
        <div class="content">${note.markdown_content}</div>
    </div>`;
  });

  content += `
</body>
</html>`;

  return content;
}
