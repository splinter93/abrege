/**
 * Instructions spécifiques pour la génération de tool calls propres
 * À ajouter au system message des agents
 */

export const TOOL_CALL_INSTRUCTIONS = `

## 🛠️ RÈGLES CRITIQUES POUR LES TOOL CALLS

### 1. Paramètres optionnels
**IMPORTANT:** N'inclus JAMAIS un paramètre si sa valeur est \`null\`, \`undefined\` ou vide.

❌ MAUVAIS :
\`\`\`json
{
  "team_id": "123",
  "date_created_gt": null,
  "date_updated_lt": null,
  "archived": false
}
\`\`\`

✅ BON :
\`\`\`json
{
  "team_id": "123"
}
\`\`\`

### 2. Respect du schéma
- N'utilise QUE les paramètres définis dans le schéma du tool
- Ne pas inventer de nouveaux paramètres
- Respecte les types exacts (number, string, boolean, array)

### 3. Paramètres requis vs optionnels
- Les paramètres **requis** doivent toujours être fournis
- Les paramètres **optionnels** ne doivent être inclus que si tu as une valeur réelle
- Si tu ne connais pas la valeur d'un paramètre optionnel, OMETS-LE complètement

### 4. Types de données
- **number**: Utilise un nombre, jamais null ou une string
- **string**: Utilise une string, jamais null (omets le paramètre)
- **boolean**: Utilise true/false, jamais null
- **array**: Utilise [] si vide, jamais null

### Exemples corrects :

**Recherche simple :**
\`\`\`json
{
  "team_id": "90151720827",
  "page": 0
}
\`\`\`

**Recherche avec filtres :**
\`\`\`json
{
  "team_id": "90151720827",
  "page": 0,
  "statuses": ["in_progress", "pending"],
  "assignees": ["user123"]
}
\`\`\`

**Recherche par dates (seulement si tu connais les valeurs) :**
\`\`\`json
{
  "team_id": "90151720827",
  "page": 0,
  "date_created_gt": 1704067200000,
  "due_date_lt": 1709337600000
}
\`\`\`

### Résumé
🎯 **OMETS les paramètres optionnels plutôt que d'envoyer null**
🎯 **Respecte le schéma exactement**
🎯 **Utilise les bons types de données**

## 📝 NOTE TYPES (source_type)

When creating notes with \`createNote\`, you can specify a \`source_type\` to change how the note is rendered:

| source_type | Description | Usage |
|-------------|-------------|-------|
| *(omit)* | Standard editable markdown note | Default behavior |
| \`"plan"\` | Structured execution plan. Read-only by default in the editor. | Multi-step tasks, project plans |
| \`"html"\` | Raw HTML rendered in a sandboxed iframe. | Dashboards, previews, artifacts |
| \`"qcm"\` | Interactive quiz. Correct answers are marked \`[x]\`. | Questionnaires, evaluations |

### Plan notes
Use checkbox syntax with emojis for status:
\`\`\`markdown
- [ ] ⏳ Step pending
- [ ] 🔄 Step in progress
- [x] ✅ Step completed
\`\`\`
Update the note via \`updateNote\` as you progress through steps.

### QCM notes
Use H2 for questions and checkboxes for options. Mark correct answers with \`[x]\`:
\`\`\`markdown
## Question 1
What is 2+2?

- [ ] 3
- [x] 4
- [ ] 5
\`\`\`

### Plan update in chat
Use the \`__plan_update\` tool to display a compact progress tracker directly in the chat. This is complementary to plan notes — use it for quick inline visibility.

For complex tasks, create a \`"plan"\` note AND use \`__plan_update\` for inline progress.
`;

/**
 * Ajoute les instructions de tool calls au system message
 */
export function addToolCallInstructions(systemMessage: string): string {
  // Ne pas ajouter deux fois
  if (systemMessage.includes('RÈGLES CRITIQUES POUR LES TOOL CALLS')) {
    return systemMessage;
  }
  
  return systemMessage + '\n\n' + TOOL_CALL_INSTRUCTIONS;
}

