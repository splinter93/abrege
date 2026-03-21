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

### Plan update in chat — BINDING CONTRACT

For any multi-step task, you are **bound** to the following 4-rule protocol. No deviation.

**Rule 1 — Declare the plan first (before any other action)**
Before executing any step, call \`__plan_update\` once with ALL steps set to \`pending\`.
This declares your work contract with the user.

**Rule 2 — Mark each step \`in_progress\` before executing it**
Immediately before starting a step, call \`__plan_update\` to set that step to \`in_progress\`.
The user must always see what you are doing right now.

**Rule 3 — Mark each step \`completed\` before moving to the next**
After finishing a step (tools executed, result obtained), call \`__plan_update\` to mark it \`completed\`.
Never start step N+1 without having marked step N as \`completed\`.

**Rule 4 — Never skip or reorder steps silently**
If you must skip or reorder a step, call \`__plan_update\` to reflect the updated plan,
then briefly explain the change in text before continuing.

**Lifecycle example (3-step task):**
\`\`\`
1. __plan_update → [step1: pending, step2: pending, step3: pending]           ← declare
2. __plan_update → [step1: in_progress, step2: pending, step3: pending]       ← before step 1
3. (execute step 1 actions)
4. __plan_update → [step1: completed, step2: in_progress, step3: pending]     ← done + next
5. (execute step 2 actions)
6. __plan_update → [step1: completed, step2: completed, step3: in_progress]
7. (execute step 3 actions)
8. __plan_update → [step1: completed, step2: completed, step3: completed]     ← all done
\`\`\`

For complex tasks, also create a \`"plan"\` note AND use \`__plan_update\` for inline progress.
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

