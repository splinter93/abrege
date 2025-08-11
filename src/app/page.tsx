import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{
      padding: '48px 24px',
      maxWidth: 880,
      margin: '0 auto',
      color: 'var(--text-1, #eaeaec)'
    }}>
      <section style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 36, lineHeight: 1.2, margin: 0 }}>Scrivia</h1>
        <p style={{ opacity: 0.8, marginTop: 12 }}>
          A minimalist, LLM-friendly markdown knowledge base. Organize, write, and publish with clean URLs and a focused UI.
        </p>
      </section>

      <nav style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link href="/private/chat" style={{
          display: 'inline-block',
          padding: '10px 14px',
          borderRadius: 8,
          background: 'var(--accent-primary, #2994ff)',
          color: 'white'
        }}>Open Chat</Link>
        <Link href="/private/dossiers" style={{
          display: 'inline-block',
          padding: '10px 14px',
          borderRadius: 8,
          background: 'var(--surface-2, #202124)',
          color: 'var(--text-1, #eaeaec)'
        }}>Browse Folders</Link>
        <Link href="/agents" style={{
          display: 'inline-block',
          padding: '10px 14px',
          borderRadius: 8,
          background: 'var(--surface-2, #202124)',
          color: 'var(--text-1, #eaeaec)'
        }}>🤖 Agents & Templates</Link>
      </nav>

      <section style={{ marginTop: 36, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24 }}>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>Quick links</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
          <li><Link href="/agents" style={{ color: 'var(--accent-hover, #5fb2ff)' }}>🤖 Agents & Templates</Link></li>
          <li><Link href="/agents/demo" style={{ color: 'var(--accent-hover, #5fb2ff)' }}>🧪 Demo Templates</Link></li>
          <li><Link href="/test-streaming" style={{ color: 'var(--accent-hover, #5fb2ff)' }}>Test Streaming</Link></li>
          <li><Link href="/test-mermaid" style={{ color: 'var(--accent-hover, #5fb2ff)' }}>Test Mermaid</Link></li>
          <li><Link href="/test-public" style={{ color: 'var(--accent-hover, #5fb2ff)' }}>Public Note Preview</Link></li>
        </ul>
      </section>
    </main>
  );
} 