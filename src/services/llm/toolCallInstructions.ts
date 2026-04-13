/**
 * Instructions injectées dans le system message de chaque agent disposant de tools.
 * Couvre : hygiene JSON des tool calls + protocole d'exécution des plans.
 */

export const TOOL_CALL_INSTRUCTIONS = `

---

## TOOL CALL RULES

### JSON parameters — strict hygiene

- Only include parameters that are defined in the tool schema.
- **Never** include a parameter whose value is \`null\`, \`undefined\`, or empty.
- Omit optional parameters you don't have a value for — don't send null.
- Respect exact types: number as number, string as string, boolean as true/false, array as [].

**Bad:**
\`\`\`json
{ "team_id": "123", "date_gt": null, "archived": false }
\`\`\`

**Good:**
\`\`\`json
{ "team_id": "123" }
\`\`\`

---

## NOTE SOURCE TYPES

When creating notes with \`createNote\`, use \`source_type\` to control rendering:

| source_type | Renders as | Use for |
|---|---|---|
| *(omit)* | Editable markdown | Default |
| \`"plan"\` | Read-only execution plan | Multi-step tasks |
| \`"html"\` | Sandboxed HTML iframe | Dashboards, visual artifacts |
| \`"qcm"\` | Interactive quiz | Questionnaires |

**Plan note syntax:**
\`\`\`markdown
- [ ] ⏳ Pending step
- [ ] 🔄 Step in progress
- [x] ✅ Completed step
\`\`\`

---

## PLAN EXECUTION PROTOCOL

Use \`__plan_update\` to show the user your progress on any multi-step task.

### The strict execution order — memorize this

For **every** step, follow this exact sequence:

\`\`\`
1. __plan_update  →  mark step as "in_progress"
2. call tool(s)   →  execute the step (no commentary yet)
3. __plan_update  →  mark step as "completed"
4. write text     →  describe what you found / what you did
5. repeat for next step
\`\`\`

**This order is non-negotiable.** The tool call MUST come after the in_progress update, and your analysis MUST come after the completed update.

### The 4 rules

**Rule 1 — Declare the full plan before doing anything**
At the very start, call \`__plan_update\` once with every step set to \`pending\`.
This is the only time you set all steps to pending. **Never reset the plan after this.**

**Rule 2 — Mark a step \`in_progress\` BEFORE calling any tool for that step**
This is mandatory, with no exceptions. If you call a tool without having marked the step \`in_progress\` first, you are violating the contract.

**Rule 3 — Mark a step \`completed\` BEFORE writing your analysis**
After the tool returns a result, immediately call \`__plan_update\` to mark it \`completed\`.
Only then write your commentary or analysis for that step.
Never start the next step without marking the current one \`completed\`.

**Rule 4 — Never pre-write results you don't have yet**
Do not write "I found X" or "The API returns Y" before you have called the tool and received its output.
Write your analysis only after the tool result is in your context.

### Lifecycle example — 3-step task

\`\`\`
__plan_update  →  [step1: pending,     step2: pending,     step3: pending]    ← declare once
__plan_update  →  [step1: in_progress, step2: pending,     step3: pending]    ← before step 1 tools
(call tools for step 1)
__plan_update  →  [step1: completed,   step2: pending,     step3: pending]    ← after step 1 result
(write analysis of step 1 results)

__plan_update  →  [step1: completed,   step2: in_progress, step3: pending]    ← before step 2 tools
(call tools for step 2)
__plan_update  →  [step1: completed,   step2: completed,   step3: pending]    ← after step 2 result
(write analysis of step 2 results)

__plan_update  →  [step1: completed,   step2: completed,   step3: in_progress] ← before step 3 tools
(call tools for step 3)
__plan_update  →  [step1: completed,   step2: completed,   step3: completed]  ← done
(write final summary)
\`\`\`

### What to never do

- **Never** call a tool without having marked the step \`in_progress\` first.

---

## NOTE EDITING PROTOCOL (TOC-first)

For any edit **inside an existing note** (not raw \`updateNote\` on the whole body):

1. Call \`getNoteTOC\` for that note \`ref\` and read the returned \`slug\` for each heading.
2. Call \`editNoteSection\` with \`section_slug\` set to the **exact** \`slug\` from that TOC (never invent or guess a slug).

**Rules**

- Do **not** call \`editNoteSection\` without having called \`getNoteTOC\` for the same \`ref\` earlier in the same task (unless you already have the TOC from a prior step in context).
- Prefer \`editNoteSection\` for: insert/replace/delete by section, renames (\`replace_heading\`), new sections (\`create_section\`).
- Use \`applyContentOperations\` only when you truly need: regex targeting, anchors like \`after_toc\`, or position-based edits that cannot be expressed as a single section operation.
- **Never** write analysis text before calling the tool.
- **Never** reset steps that are already \`completed\` back to \`pending\`.
- **Never** silently skip or reorder steps. If you must, call \`__plan_update\` to reflect it and explain why.
`;

/**
 * Ajoute les instructions de tool calls au system message.
 * Idempotent — n'injecte pas deux fois si déjà présent.
 */
export function addToolCallInstructions(systemMessage: string): string {
  if (systemMessage.includes('TOOL CALL RULES')) {
    return systemMessage;
  }
  return systemMessage + '\n\n' + TOOL_CALL_INSTRUCTIONS;
}
