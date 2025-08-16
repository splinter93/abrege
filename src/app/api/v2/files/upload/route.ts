import { NextRequest, NextResponse } from 'next/server';
import { logApi } from '@/utils/logger';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { createSupabaseClient } from '@/utils/supabaseClient';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_files_upload',
    component: 'API_V2',
    clientType
  };

  logApi('v2_files_upload', '🚀 Début upload fichier v2', context);

  // 🔐 Authentification
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi('v2_files_upload', `❌ Authentification échouée: ${authResult.error}`, context);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const userId = authResult.userId!;
  const supabase = createSupabaseClient();

  try {
    // Vérifier que c'est une requête multipart
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('multipart/form-data')) {
      logApi('v2_files_upload', '❌ Content-Type incorrect', context);
      return NextResponse.json(
        { error: 'Content-Type doit être multipart/form-data' },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folderId = formData.get('folder_id') as string | null;
    const classeurId = formData.get('classeur_id') as string | null;

    if (!file) {
      logApi('v2_files_upload', '❌ Aucun fichier fourni', context);
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validation du fichier
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      logApi('v2_files_upload', `❌ Fichier trop volumineux: ${file.size} bytes`, context);
      return NextResponse.json(
        { error: 'Fichier trop volumineux (max 10MB)' },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Types de fichiers autorisés
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'text/markdown',
      'application/json', 'application/xml'
    ];

    if (!allowedTypes.includes(file.type)) {
      logApi('v2_files_upload', `❌ Type de fichier non autorisé: ${file.type}`, context);
      return NextResponse.json(
        { error: 'Type de fichier non autorisé' },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Générer un nom unique pour le fichier
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const fileExtension = file.name.split('.').pop() || '';
    const fileName = `${file.name.replace(/\.[^/.]+$/, '')}_${timestamp}_${randomSuffix}.${fileExtension}`;

    // Upload vers Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('files')
      .upload(`${userId}/${fileName}`, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      logApi('v2_files_upload', `❌ Erreur upload storage: ${uploadError.message}`, context);
      return NextResponse.json(
        { error: `Erreur upload: ${uploadError.message}` },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Récupérer l'URL publique
    const { data: { publicUrl } } = supabase.storage
      .from('files')
      .getPublicUrl(`${userId}/${fileName}`);

    // Enregistrer dans la base de données
    const { data: fileRecord, error: dbError } = await supabase
      .from('files')
      .insert({
        name: file.name,
        original_name: file.name,
        size: file.size,
        type: file.type,
        url: publicUrl,
        storage_path: `${userId}/${fileName}`,
        folder_id: folderId,
        classeur_id: classeurId,
        user_id: userId
      })
      .select()
      .single();

    if (dbError) {
      logApi('v2_files_upload', `❌ Erreur base de données: ${dbError.message}`, context);
      // Nettoyer le fichier uploadé en cas d'erreur DB
      await supabase.storage.from('files').remove([`${userId}/${fileName}`]);
      return NextResponse.json(
        { error: `Erreur base de données: ${dbError.message}` },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi('v2_files_upload', `✅ Fichier uploadé en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      message: 'Fichier uploadé avec succès',
      file: {
        id: fileRecord.id,
        name: fileRecord.name,
        size: fileRecord.size,
        type: fileRecord.type,
        url: fileRecord.url,
        folder_id: fileRecord.folder_id,
        classeur_id: fileRecord.classeur_id,
        created_at: fileRecord.created_at
      }
    }, { headers: { "Content-Type": "application/json" } });

  } catch (err: unknown) {
    const error = err as Error;
    logApi('v2_files_upload', `❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 