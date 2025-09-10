export const mermaidExamples = {
  flowchart: `\`\`\`mermaid
flowchart TD
    A[Début] --> B{Condition}
    B -->|Oui| C[Action 1]
    B -->|Non| D[Action 2]
    C --> E[Fin]
    D --> E
\`\`\``,

  sequence: `\`\`\`mermaid
sequenceDiagram
    participant U as Utilisateur
    participant S as Système
    participant A as API
    
    U->>S: Demande de données
    S->>A: Requête API
    A-->>S: Réponse
    S-->>U: Affichage des données
\`\`\``,

  class: `\`\`\`mermaid
classDiagram
    class ChatComponent {
        +messages: Message[]
        +loading: boolean
        +sendMessage()
        +clearMessages()
    }
    
    class Message {
        +id: string
        +role: 'user' | 'assistant'
        +content: string
        +timestamp: Date
    }
    
    ChatComponent --> Message
\`\`\``,

  pie: `\`\`\`mermaid
pie title Répartition des technologies
    "React" : 40
    "TypeScript" : 30
    "CSS" : 20
    "Autres" : 10
\`\`\``,

  gantt: `\`\`\`mermaid
gantt
    title Planning du projet
    dateFormat  YYYY-MM-DD
    section Phase 1
    Design UI           :done,    des1, 2024-01-01, 2024-01-07
    Implémentation      :active,  impl1, 2024-01-08, 2024-01-15
    section Phase 2
    Tests               :         test1, 2024-01-16, 2024-01-20
    Déploiement         :         depl1, 2024-01-21, 2024-01-25
\`\`\``
};

export const testContent = `
# Exemple de contenu avec Mermaid

Voici un diagramme de flux simple :

${mermaidExamples.flowchart}

Et un diagramme de séquence :

${mermaidExamples.sequence}

Le texte normal continue ici avec du **markdown** et des \`code blocks\`.
`; 