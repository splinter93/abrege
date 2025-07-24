import React from 'react';
import { createClient } from '@supabase/supabase-js';
import LogoScrivia from '@/components/LogoScrivia';
import Header from '@/components/Header';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface PreviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function PreviewPage({ params }: PreviewPageProps) {
  const { id } = await params;
  
  // Récupérer la note (seulement si publiée)
  const { data: note, error } = await supabase
    .from('articles')
    .select('source_title, html_content, header_image, created_at, updated_at')
    .eq('id', id)
    .eq('ispublished', true)
    .single();

  if (error || !note) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <LogoScrivia />
        <h1>Note non trouvée ou non publiée</h1>
        <p>Cette note n'existe pas ou n'est pas accessible publiquement.</p>
      </div>
    );
  }

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      lineHeight: 1.6,
      color: '#D4D4D4',
      background: '#15151b',
      minHeight: '100vh'
    }}>
      <div style={{ width: '100%', background: '#232325' }}>
        <Header />
      </div>
      {/* Header Image */}
      {note.header_image && (
        <img 
          src={note.header_image} 
          alt="Header"
          style={{ 
            width: '100%', 
            height: '300px', 
            objectFit: 'cover', 
            borderRadius: '12px',
            marginBottom: '2rem'
          }}
        />
      )}
      
      {/* Titre */}
      <h1 style={{ 
        fontSize: '2.5rem', 
        fontWeight: '700', 
        marginBottom: '1rem',
        color: '#1a1a1a'
      }}>
        {note.source_title}
      </h1>
      
      {/* Métadonnées */}
      <div style={{ 
        color: '#666', 
        fontSize: '0.9rem', 
        marginBottom: '2rem',
        borderBottom: '1px solid #eee',
        paddingBottom: '1rem'
      }}>
        <span>Créé le {new Date(note.created_at).toLocaleDateString('fr-FR')}</span>
        {note.updated_at !== note.created_at && (
          <span style={{ marginLeft: '1rem' }}>
            • Modifié le {new Date(note.updated_at).toLocaleDateString('fr-FR')}
          </span>
        )}
      </div>
      
      {/* Contenu HTML */}
      <div 
        className="markdown-body"
        dangerouslySetInnerHTML={{ __html: note.html_content || '' }}
        style={{
          fontSize: '1.1rem',
          lineHeight: 1.7
        }}
      />
      
      {/* Footer */}
      <div style={{ 
        marginTop: '3rem', 
        paddingTop: '2rem', 
        borderTop: '1px solid #eee',
        textAlign: 'center',
        color: '#666',
        fontSize: '0.9rem'
      }}>
        <p>Partagé via Abrège</p>
      </div>
    </div>
  );
} 