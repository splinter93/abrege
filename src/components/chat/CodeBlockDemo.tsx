'use client';
import React from 'react';
import CodeBlock from './CodeBlock';

const CodeBlockDemo: React.FC = () => {
  const javascriptCode = `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Exemple d'utilisation
console.log(fibonacci(10)); // 55`;

  const pythonCode = `def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

# Exemple d'utilisation
print(fibonacci(10))  # 55`;

  const cssCode = `.chat-markdown-code-block {
  background: rgba(0, 0, 0, 0.35);
  padding: 20px;
  border-radius: 12px;
  overflow-x: auto;
  margin: 24px 0;
  border: 1px solid rgba(255, 255, 255, 0.08);
  position: relative;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
}`;

  const sqlCode = `SELECT 
  u.username,
  u.email,
  COUNT(p.id) as post_count
FROM users u
LEFT JOIN posts p ON u.id = p.user_id
WHERE u.active = true
GROUP BY u.id, u.username, u.email
HAVING COUNT(p.id) > 0
ORDER BY post_count DESC;`;

  return (
    <div className="code-block-demo">
      <h2>Démonstration des Blocs de Code</h2>
      
      <p>Voici différents exemples de blocs de code avec le composant CodeBlock :</p>
      
      <h3>JavaScript</h3>
      <CodeBlock language="javascript">
        {javascriptCode}
      </CodeBlock>
      
      <h3>Python</h3>
      <CodeBlock language="python">
        {pythonCode}
      </CodeBlock>
      
      <h3>CSS</h3>
      <CodeBlock language="css">
        {cssCode}
      </CodeBlock>
      
      <h3>SQL</h3>
      <CodeBlock language="sql">
        {sqlCode}
      </CodeBlock>
      
      <h3>Code sans langage spécifié</h3>
      <CodeBlock>
        {`// Ce bloc n'a pas de langage spécifié
// Le bouton de copie fonctionne quand même
// Et le style reste cohérent`}
      </CodeBlock>
    </div>
  );
};

export default CodeBlockDemo;
