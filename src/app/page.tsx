export default function HomePage() {
  return (
    <main style={{ padding: '24px', color: 'var(--text-1, #eaeaec)' }}>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>Abrège</h1>
      <p style={{ opacity: 0.8 }}>Welcome. Use the navigation or go to the chat.</p>
      <p style={{ marginTop: 12 }}>
        <a href="/chat" style={{ color: 'var(--accent-primary, #2994ff)' }}>Open Chat</a>
      </p>
    </main>
  );
} 