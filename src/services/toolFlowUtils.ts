import crypto from 'crypto';

export function canonicalJsonString(input: unknown): string {
  try {
    const obj = typeof input === 'string' ? JSON.parse(input) : input;
    const sorter = (x: any): any => {
      if (Array.isArray(x)) return x.map(sorter);
      if (x && typeof x === 'object') {
        return Object.keys(x)
          .sort()
          .reduce((acc: Record<string, any>, key) => {
            acc[key] = sorter((x as any)[key]);
            return acc;
          }, {});
      }
      return x;
    };
    return JSON.stringify(sorter(obj));
  } catch {
    return typeof input === 'string' ? input : JSON.stringify(input || {});
  }
}

export function computeToolCallHash(toolName: string, args: string): string {
  const canonical = canonicalJsonString(args);
  return crypto.createHash('sha1').update(`${toolName}|${canonical}`).digest('hex');
}

export function buildObservation(toolName: string, toolContentJsonString: string): { text: string; missing: string[] } {
  let text = `Observation: l'outil ${toolName} a échoué.`;
  let missing: string[] = [];
  try {
    const data = JSON.parse(toolContentJsonString || '{}');
    if (data?.error) text += ` Raison: ${data.error}.`;
    if (Array.isArray(data?.missing) && data.missing.length > 0) {
      missing = data.missing;
      text += ` Données manquantes: ${missing.join(', ')}.`;
    }
    if (Array.isArray(data?.hints) && data.hints.length > 0) {
      text += ` Indices: ${data.hints.join(' ')}`;
    }
  } catch {
    // ignore parsing issues
  }
  return { text, missing };
} 