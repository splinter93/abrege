import { NextRequest, NextResponse } from 'next/server';
import { getPuppeteerService } from '@/services/mcp/puppeteerService';
import { z } from 'zod';

const ExtractContentSchema = z.object({
  selectors: z.object({
    title: z.string().optional(),
    content: z.string().optional(),
    author: z.string().optional(),
    date: z.string().optional(),
    tags: z.string().optional()
  }).optional(),
  extractType: z.enum(['article', 'product', 'news', 'custom']).default('article')
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { selectors, extractType } = ExtractContentSchema.parse(body);

    const puppeteer = getPuppeteerService();

    // Script d'extraction intelligent selon le type
    const extractionScript = getExtractionScript(extractType, selectors);
    const result = await puppeteer.evaluate(extractionScript);

    return NextResponse.json({
      success: true,
      content: result,
      type: extractType,
      extracted_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Puppeteer extract content error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function getExtractionScript(extractType: string, selectors?: any): string {
  const baseSelectors = {
    title: selectors?.title || 'h1, .title, [data-title]',
    content: selectors?.content || 'article, .content, .post-content, main',
    author: selectors?.author || '.author, [data-author], .byline',
    date: selectors?.date || '.date, .published, time, [datetime]',
    tags: selectors?.tags || '.tags, .categories, .keywords'
  };

  switch (extractType) {
    case 'article':
      return `
        (() => {
          const extractText = (selector) => {
            const el = document.querySelector(selector);
            return el ? el.textContent.trim() : null;
          };
          
          const extractMultiple = (selector) => {
            const els = document.querySelectorAll(selector);
            return Array.from(els).map(el => el.textContent.trim()).filter(Boolean);
          };

          return {
            title: extractText('${baseSelectors.title}'),
            content: extractText('${baseSelectors.content}') || document.body.textContent.substring(0, 2000),
            author: extractText('${baseSelectors.author}'),
            date: extractText('${baseSelectors.date}'),
            tags: extractMultiple('${baseSelectors.tags}'),
            url: window.location.href,
            domain: window.location.hostname,
            wordCount: document.body.textContent.split(' ').length,
            extracted_at: new Date().toISOString()
          };
        })()
      `;

    case 'news':
      return `
        (() => {
          const articles = Array.from(document.querySelectorAll('article, .article, .news-item, .post')).slice(0, 10).map(el => ({
            title: el.querySelector('h1, h2, h3, .title, .headline')?.textContent?.trim(),
            summary: el.querySelector('.summary, .excerpt, .description')?.textContent?.trim(),
            link: el.querySelector('a')?.href,
            date: el.querySelector('.date, time, .published')?.textContent?.trim()
          })).filter(article => article.title);

          return {
            type: 'news',
            articles,
            total: articles.length,
            url: window.location.href,
            extracted_at: new Date().toISOString()
          };
        })()
      `;

    case 'product':
      return `
        (() => {
          return {
            title: document.querySelector('h1, .product-title, .title')?.textContent?.trim(),
            price: document.querySelector('.price, .cost, [data-price]')?.textContent?.trim(),
            description: document.querySelector('.description, .product-description')?.textContent?.trim(),
            images: Array.from(document.querySelectorAll('img')).map(img => img.src).slice(0, 5),
            availability: document.querySelector('.availability, .stock')?.textContent?.trim(),
            rating: document.querySelector('.rating, .stars')?.textContent?.trim(),
            url: window.location.href,
            extracted_at: new Date().toISOString()
          };
        })()
      `;

    default:
      return `
        (() => {
          return {
            title: document.title,
            content: document.body.textContent.substring(0, 1000),
            url: window.location.href,
            extracted_at: new Date().toISOString()
          };
        })()
      `;
  }
}

