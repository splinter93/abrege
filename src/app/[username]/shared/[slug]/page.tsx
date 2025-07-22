import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function Page(props: any) {
  const { username, slug } = await props.params;

  // Décoder l'username (retirer le @ et décoder l'URL)
  const decodedUsername = decodeURIComponent(username).replace(/^@/, '');

  // Chercher l'utilisateur par username
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('username', decodedUsername)
    .single();

  if (userError || !user) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Utilisateur non trouvé</h1>
        <p>Vérifiez l'URL ou contactez l'auteur.</p>
        <p>Debug: error = {userError?.message}</p>
      </div>
    );
  }

  // Chercher la note par slug et user_id, ispublished = true
  const { data: note, error: noteError } = await supabase
    .from('articles')
    .select('source_title, html_content, markdown_content, header_image, created_at, updated_at')
    .eq('slug', slug)
    .eq('user_id', user.id)
    .eq('ispublished', true)
    .single();

  if (noteError || !note) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Note non trouvée ou non publiée</h1>
        <p>Vérifiez l'URL ou contactez l'auteur.</p>
      </div>
    );
  }

  // Afficher directement le contenu avec le même design que la preview de l'éditeur
  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          :root {
            --bg-main: #1a1a1a;
            --text-primary: #ffffff;
            --text-1: #ffffff;
            --text-2: #b3a9a0;
            --text-3: #888888;
            --accent-primary: #e55a2c;
            --accent-hover: #f97316;
            --surface-1: #2a2a2a;
            --surface-2: #3a3a3a;
            --border-subtle: #404040;
          }
          
          /* MARKDOWN STYLES */
          .markdown-body {
            color: var(--text-1);
            font-family: 'Noto Sans', sans-serif !important;
            font-size: 1.08rem;
            line-height: 1.8;
            background: none;
            margin: 0;
            padding: 0;
          }
          
          /* TITRES */
          .markdown-body h1 {
            font-size: 2.25rem;
            font-weight: 700;
            color: var(--text-primary);
            margin: 2rem 0 1rem 0;
            line-height: 1.1;
            font-family: 'Noto Sans, Inter, Arial, sans-serif';
          }
          .markdown-body h2 {
            font-size: 1.875rem;
            font-weight: 600;
            color: var(--text-primary);
            margin: 1.75rem 0 0.75rem 0;
            line-height: 1.2;
          }
          .markdown-body h3 {
            font-size: 1.5rem;
            font-weight: 600;
            color: var(--text-primary);
            margin: 1.5rem 0 0.5rem 0;
            line-height: 1.3;
          }
          .markdown-body h4 {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--text-primary);
            margin: 1.25rem 0 0.5rem 0;
            line-height: 1.4;
          }
          .markdown-body h5 {
            font-size: 1.125rem;
            font-weight: 600;
            color: var(--text-primary);
            margin: 1rem 0 0.5rem 0;
            line-height: 1.4;
          }
          .markdown-body h6 {
            font-size: 1rem;
            font-weight: 600;
            color: var(--text-primary);
            margin: 1rem 0 0.5rem 0;
            line-height: 1.4;
          }
          
          /* PARAGRAPHES */
          .markdown-body p {
            margin: 1rem 0;
            line-height: 1.8;
            color: var(--text-1);
          }
          
          /* LISTES */
          .markdown-body ul,
          .markdown-body ol {
            margin-top: 0.5em;
            margin-bottom: 0.5em;
            margin-left: 1.5em;
            padding-left: 0;
          }
          .markdown-body li {
            margin-top: 0.12em;
            margin-bottom: 0.12em;
            line-height: 1.5;
            padding-left: 0.2rem;
          }
          
          /* LIENS */
          .markdown-body a {
            color: var(--accent-hover);
            text-decoration: none;
            filter: brightness(0.8);
            transition: filter 0.15s;
          }
          .markdown-body a:hover {
            color: var(--accent-primary);
            filter: brightness(0.9);
          }
          
          /* CODE */
          .markdown-body code {
            background: var(--surface-2);
            color: var(--accent-primary);
            padding: 0.2em 0.4em;
            border-radius: 4px;
            font-size: 0.9em;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          }
          .markdown-body pre {
            background: var(--surface-2);
            padding: 1rem;
            border-radius: 8px;
            overflow-x: auto;
            margin: 1rem 0;
          }
          .markdown-body pre code {
            background: none;
            padding: 0;
            color: var(--text-1);
          }
          
          /* BLOCKQUOTES */
          .markdown-body blockquote {
            border-left: 4px solid var(--accent-primary);
            padding-left: 1rem;
            margin: 1rem 0;
            color: var(--text-2);
            font-style: italic;
          }
          
          /* TABLEAUX */
          .markdown-body .tableWrapper {
            border: 1px solid var(--border-subtle);
            border-radius: 10px;
            overflow: hidden;
            background: none;
            margin: 1.5rem 0;
            padding: 0;
          }
          .markdown-body table {
            width: 100%;
            border-collapse: collapse;
            border-spacing: 0;
            background: none;
            border-radius: 10px;
            table-layout: fixed;
            margin: 0;
            padding: 0;
          }
          .markdown-body th,
          .markdown-body td {
            border: none;
            border-bottom: 1px solid var(--border-subtle);
            border-right: 1px solid var(--border-subtle);
            background: none;
            color: var(--text-1);
            font-size: 1rem;
            font-weight: 400;
            text-align: center;
            padding: 0.65em 0.9em;
            min-width: 0;
            max-width: none;
          }
          .markdown-body th {
            background: var(--surface-2);
            color: var(--accent-primary);
            font-weight: 600;
            font-size: 1.18rem;
          }
          .markdown-body th:last-child,
          .markdown-body td:last-child {
            border-right: none;
          }
          .markdown-body tr:last-child td,
          .markdown-body tr:last-child th {
            border-bottom: none;
          }
          .markdown-body tbody tr:nth-child(odd) td {
            background: var(--surface-2);
          }
          .markdown-body tbody tr:nth-child(even) td {
            background: var(--surface-1);
          }
          
          /* IMAGES */
          .markdown-body img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            margin: 1rem 0;
          }
          
          /* HR */
          .markdown-body hr {
            border: none;
            border-top: 1px solid var(--border-subtle);
            margin: 2rem 0;
          }
          
          /* STRONG ET EM */
          .markdown-body strong {
            font-weight: 600;
            color: var(--text-primary);
          }
          .markdown-body em {
            font-style: italic;
            color: var(--text-2);
          }
        `
      }} />
      <div style={{ width: '100vw', minHeight: '100vh', background: '#1a1a1a', paddingBottom: 64, overflowY: 'auto', height: '100vh' }}>
        {note.header_image && (
          <div style={{ width: '100%', maxHeight: 300, overflow: 'hidden', marginBottom: 32 }}>
            <img
              src={note.header_image}
              alt="Header"
              style={{ width: '100%', objectFit: 'cover', maxHeight: 300, borderRadius: 0 }}
              draggable={false}
            />
          </div>
        )}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', margin: '0 auto', marginBottom: 32, gap: 32 }}>
          <div style={{ maxWidth: 750, width: 750 }}>
            <h1 style={{
              fontSize: '2.25rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: 0,
              padding: 0,
              textAlign: 'left',
              maxWidth: 750,
              width: 750,
              lineHeight: 1.1,
              fontFamily: 'Noto Sans, Inter, Arial, sans-serif',
            }}>{note.source_title}</h1>
            <div style={{ height: 18 }} />
            <div
              className="markdown-body"
              style={{
                maxWidth: 750,
                width: 750,
                margin: '0 auto',
                background: 'none',
                padding: '0 0 64px 0',
                fontSize: '1.13rem',
                color: 'var(--text-primary)',
                minHeight: '60vh',
                pointerEvents: 'auto',
                userSelect: 'text',
              }}
              dangerouslySetInnerHTML={{ __html: note.html_content || '' }}
            />
          </div>
        </div>
        {/* Footer discret */}
        <div style={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          color: '#b3a9a0',
          fontSize: '0.8rem',
          opacity: 0.6
        }}>
          Crafted with Scrivia
        </div>
      </div>
    </>
  );
} 