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

  // Register
  const registerRes = await fetch('/api/v2/files/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader },
    body: JSON.stringify({
      key,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      scope: { note_ref: noteRef },
      visibility_mode: 'inherit_note',
    }),
  });
  if (!registerRes.ok) {
    const err = await registerRes.json().catch(() => ({}));
    throw new Error(err.error || 'Erreur register');
  }
  const { file: saved, signed_url, public_control_url } = await registerRes.json();
  const publicUrl = signed_url || public_control_url || `/api/v1/public/file/${saved.id}${saved.etag ? `?v=${saved.etag}` : ''}`;

  return { publicUrl, saved };
} 