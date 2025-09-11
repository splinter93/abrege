import { Browser, Page } from 'puppeteer';

// Dynamic imports to avoid Next.js compilation issues
let puppeteer: any;
let StealthPlugin: any;

async function initPuppeteer() {
  if (!puppeteer) {
    puppeteer = (await import('puppeteer-extra')).default;
    StealthPlugin = (await import('puppeteer-extra-plugin-stealth')).default;
    puppeteer.use(StealthPlugin());
  }
  return puppeteer;
}

export interface PuppeteerServiceConfig {
  headless?: boolean;
  timeout?: number;
}

export class PuppeteerService {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private config: PuppeteerServiceConfig;

  constructor(config: PuppeteerServiceConfig = {}) {
    this.config = {
      headless: true,
      timeout: 30000,
      ...config
    };
  }

  /**
   * Initialize the browser
   */
  async init(): Promise<void> {
    if (this.browser) return;

    try {
      const puppeteerInstance = await initPuppeteer();
      this.browser = await puppeteerInstance.launch({
        headless: this.config.headless ? 'new' : false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote',
          '--single-process'
        ]
      });

      const pages = await this.browser.pages();
      this.page = pages[0] || await this.browser.newPage();
      
      // Set viewport
      await this.page.setViewport({ width: 1280, height: 720 });
      
    } catch (error) {
      console.error('Failed to initialize Puppeteer:', error);
      throw error;
    }
  }

  /**
   * Navigate to a URL
   */
  async navigate(url: string): Promise<void> {
    await this.ensureInitialized();
    if (!this.page) throw new Error('No page available');
    
    try {
      await this.page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: this.config.timeout 
      });
    } catch (error) {
      // If page is detached, create a new one
      if (error instanceof Error && error.message.includes('detached')) {
        this.page = await this.browser!.newPage();
        await this.page.goto(url, { 
          waitUntil: 'networkidle2',
          timeout: this.config.timeout 
        });
      } else {
        throw error;
      }
    }
  }

  /**
   * Take a screenshot
   */
  async screenshot(selector?: string): Promise<Buffer> {
    await this.ensureInitialized();
    if (!this.page) throw new Error('No page available');

    if (selector) {
      const element = await this.page.$(selector);
      if (!element) throw new Error(`Element not found: ${selector}`);
      return await element.screenshot();
    } else {
      return await this.page.screenshot({ fullPage: true });
    }
  }

  /**
   * Click an element
   */
  async click(selector: string): Promise<void> {
    await this.ensureInitialized();
    if (!this.page) throw new Error('No page available');
    
    await this.page.waitForSelector(selector, { visible: true });
    await this.page.click(selector);
  }

  /**
   * Fill a form field
   */
  async fill(selector: string, value: string): Promise<void> {
    await this.ensureInitialized();
    if (!this.page) throw new Error('No page available');
    
    await this.page.waitForSelector(selector, { visible: true });
    await this.page.type(selector, value);
  }

  /**
   * Select an option from dropdown
   */
  async select(selector: string, value: string): Promise<void> {
    await this.ensureInitialized();
    if (!this.page) throw new Error('No page available');
    
    await this.page.waitForSelector(selector, { visible: true });
    await this.page.select(selector, value);
  }

  /**
   * Hover over an element
   */
  async hover(selector: string): Promise<void> {
    await this.ensureInitialized();
    if (!this.page) throw new Error('No page available');
    
    await this.page.waitForSelector(selector, { visible: true });
    await this.page.hover(selector);
  }

  /**
   * Execute JavaScript in the page
   */
  async evaluate<T = any>(script: string): Promise<T> {
    await this.ensureInitialized();
    if (!this.page) throw new Error('No page available');
    
    try {
      return await this.page.evaluate(script);
    } catch (error) {
      // If page is detached, create a new one and retry
      if (error instanceof Error && error.message.includes('detached')) {
        this.page = await this.browser!.newPage();
        return await this.page.evaluate(script);
      } else {
        throw error;
      }
    }
  }

  /**
   * Get page content
   */
  async getContent(): Promise<string> {
    await this.ensureInitialized();
    if (!this.page) throw new Error('No page available');
    
    return await this.page.content();
  }

  /**
   * Get page title
   */
  async getTitle(): Promise<string> {
    await this.ensureInitialized();
    if (!this.page) throw new Error('No page available');
    
    return await this.page.title();
  }

  /**
   * Close the browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.browser) {
      await this.init();
    }
  }
}

// Singleton instance
let puppeteerService: PuppeteerService | null = null;

export function getPuppeteerService(): PuppeteerService {
  if (!puppeteerService) {
    puppeteerService = new PuppeteerService();
  }
  return puppeteerService;
}
