import { supabase } from '@/supabaseClient';

export async function uploadImageForNote(file: File, noteRef: string): Promise<{ publicUrl: string; saved: any }> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Authentification requise');

  const authHeader = { Authorization: `Bearer ${token}` } as const;

  // Presign
  const presignRes = await fetch('/api/v2/files/presign-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader },
    body: JSON.stringify({
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      scope: { note_ref: noteRef },
      visibility_mode: 'inherit_note',
    }),
  });
  if (!presignRes.ok) {
    const err = await presignRes.json().catch(() => ({}));
    throw new Error(err.error || 'Erreur presign');
  }
  const { upload_url, key, headers } = await presignRes.json();

  // Upload
  const uploadRes = await fetch(upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type, ...(headers || {}) },
    body: file,
  });
  if (!uploadRes.ok) {
    throw new Error("Erreur lors de l'upload S3");
  }

  // Helper: suggest a unique filename by adding " (n)" before extension
  const buildFileNameVariant = (originalName: string, index: number): string => {
    if (index <= 1) return originalName;
    const lastDotIndex = originalName.lastIndexOf('.');
    if (lastDotIndex <= 0) {
      return `${originalName} (${index})`;
    }
    const base = originalName.slice(0, lastDotIndex);
    const ext = originalName.slice(lastDotIndex);
    return `${base} (${index})${ext}`;
  };

  // Register with retry on duplicate filename
  let attempt = 1;
  const maxAttempts = 10;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const candidateName = buildFileNameVariant(file.name, attempt);
    const registerRes = await fetch('/api/v2/files/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({
        key,
        file_name: candidateName,
        file_type: file.type,
        file_size: file.size,
        scope: { note_ref: noteRef },
        visibility_mode: 'inherit_note',
      }),
    });

    if (registerRes.ok) {
      const { file: saved, signed_url, public_control_url } = await registerRes.json();
      // Use the canonical AWS URL from the files table instead of signed_url
      // The canonical URL is already stored in files.url and is the clean URL we want
      const publicUrl = saved.url || `/api/ui/public/file/${saved.id}${saved.etag ? `?v=${saved.etag}` : ''}`;
      return { publicUrl, saved };
    }

    const errJson = await registerRes.json().catch(() => ({} as any));
    const message: string = errJson?.error || 'Erreur register';
    const isDuplicate = /duplicate key value|files_user_id_filename_key/i.test(message);

    if (isDuplicate && attempt < maxAttempts) {
      attempt += 1;
      continue;
    }

    throw new Error(message);
  }
} 