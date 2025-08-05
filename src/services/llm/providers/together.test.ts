import { TogetherProvider } from './together';

describe('TogetherProvider', () => {
  let provider: TogetherProvider;

  beforeEach(() => {
    provider = new TogetherProvider();
  });

  describe('Configuration', () => {
    it('should have correct name and id', () => {
      expect(provider.name).toBe('Together AI');
      expect(provider.id).toBe('together');
    });

    it('should return default config', () => {
      const config = provider.getDefaultConfig();
      expect(config.model).toBe('openai/gpt-oss-120b');
      expect(config.temperature).toBe(0.7);
      expect(config.max_tokens).toBe(4000);
      expect(config.top_p).toBe(0.9);
    });
  });

  describe('Availability', () => {
    it('should be unavailable without API key', () => {
      expect(provider.isAvailable()).toBe(false);
    });

    it('should be available with API key', () => {
      // Simuler une clé API
      process.env.TOGETHER_API_KEY = 'test-key';
      const providerWithKey = new TogetherProvider();
      expect(providerWithKey.isAvailable()).toBe(true);
      delete process.env.TOGETHER_API_KEY;
    });
  });

  describe('API Configuration', () => {
    it('should use correct base URL', () => {
      const config = provider.getDefaultConfig();
      expect(config.api_config.baseUrl).toBe('https://api.together.xyz/v1');
      expect(config.api_config.endpoint).toBe('/chat/completions');
    });
  });
}); 