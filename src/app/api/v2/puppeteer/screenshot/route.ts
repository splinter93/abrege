import { NextRequest, NextResponse } from 'next/server';
import { getPuppeteerService } from '@/services/mcp/puppeteerService';
import { z } from 'zod';

const ScreenshotSchema = z.object({
  selector: z.string().optional(),
  fullPage: z.boolean().optional().default(true)
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { selector, fullPage } = ScreenshotSchema.parse(body);

    const puppeteer = getPuppeteerService();
    const screenshot = await puppeteer.screenshot(selector);

    // Convert to base64 for JSON response
    const base64 = screenshot.toString('base64');

    return NextResponse.json({
      success: true,
      screenshot: `data:image/png;base64,${base64}`,
      selector: selector || 'full-page'
    });

  } catch (error) {
    console.error('Puppeteer screenshot error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

