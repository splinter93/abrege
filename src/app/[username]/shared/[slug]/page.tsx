import { redirect } from 'next/navigation';

export default async function Page({ params }: { params: { username: string; slug: string } }) {
  const { username, slug } = params;

  // Appel API publique pour récupérer la note par username et slug
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL || ''}/api/v1/public/note/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`,
    { cache: 'no-store' }
  );

  if (!res.ok) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Note non trouvée ou non publiée</h1>
        <p>Vérifiez l'URL ou contactez l'auteur.</p>
      </div>
    );
  }

  const data = await res.json();
  const note = data.note;

  if (!note || !note.id || !note.ispublished) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Note non trouvée ou non publiée</h1>
        <p>Vérifiez l'URL ou contactez l'auteur.</p>
      </div>
    );
  }

  // Redirige vers la page preview publique
  redirect(`/preview/${note.id}`);
} 