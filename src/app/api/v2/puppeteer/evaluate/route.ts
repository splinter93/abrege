import { NextRequest, NextResponse } from 'next/server';
import { getPuppeteerService } from '@/services/mcp/puppeteerService';
import { z } from 'zod';

const EvaluateSchema = z.object({
  script: z.string(),
  returnValue: z.boolean().optional().default(true)
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { script, returnValue } = EvaluateSchema.parse(body);

    const puppeteer = getPuppeteerService();
    const result = await puppeteer.evaluate(script);

    return NextResponse.json({
      success: true,
      result: returnValue ? result : null,
      script: script.substring(0, 100) + (script.length > 100 ? '...' : '')
    });

  } catch (error) {
    console.error('Puppeteer evaluate error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

