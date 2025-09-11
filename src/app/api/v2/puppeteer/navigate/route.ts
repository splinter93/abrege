import { NextRequest, NextResponse } from 'next/server';
import { getPuppeteerService } from '@/services/mcp/puppeteerService';
import { z } from 'zod';

const NavigateSchema = z.object({
  url: z.string().url(),
  waitFor: z.string().optional().default('networkidle2'),
  timeout: z.number().optional().default(30000)
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, waitFor, timeout } = NavigateSchema.parse(body);

    const puppeteer = getPuppeteerService();
    await puppeteer.navigate(url);

    return NextResponse.json({
      success: true,
      url,
      title: await puppeteer.getTitle()
    });

  } catch (error) {
    console.error('Puppeteer navigate error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

