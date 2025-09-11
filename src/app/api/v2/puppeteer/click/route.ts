import { NextRequest, NextResponse } from 'next/server';
import { getPuppeteerService } from '@/services/mcp/puppeteerService';
import { z } from 'zod';

const ClickSchema = z.object({
  selector: z.string(),
  waitForVisible: z.boolean().optional().default(true)
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { selector, waitForVisible } = ClickSchema.parse(body);

    const puppeteer = getPuppeteerService();
    await puppeteer.click(selector);

    return NextResponse.json({
      success: true,
      selector,
      message: 'Element clicked successfully'
    });

  } catch (error) {
    console.error('Puppeteer click error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

