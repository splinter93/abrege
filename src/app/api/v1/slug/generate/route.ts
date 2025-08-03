import { SlugGenerator } from '@/utils/slugGenerator';
import { z } from 'zod';

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const schema = z.object({
      title: z.string().min(1, 'title requis'),
      type: z.enum(['note', 'folder', 'classeur']),
      userId: z.string().min(1, 'userId requis'),
    });
    
    const parseResult = schema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Payload invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    
    const { title, type, userId } = parseResult.data;
    const slug = await SlugGenerator.generateSlug(title, type, userId);
    
    return new Response(JSON.stringify({ slug }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err: unknown) {
    const error = err as Error;
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
} 