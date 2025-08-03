const ProviderFactory = require('../providers/provider-factory');
const OllamaProvider = require('../providers/ollama-provider');
const OpenAIProvider = require('../providers/openai-provider');

describe('ProviderFactory', () => {
  describe('createProvider', () => {
    test('should create Ollama provider with correct configuration', () => {
      const config = {
        name: 'test-ollama',
        type: 'ollama',
        url: 'http://localhost:11434',
        model: 'phi3:mini',
        timeout: 120000
      };

      const provider = ProviderFactory.createProvider(config);
      
      expect(provider).toBeInstanceOf(OllamaProvider);
      expect(provider.config.name).toBe('test-ollama');
      expect(provider.model).toBe('phi3:mini');
    });

    test('should create OpenAI provider with correct configuration', () => {
      const config = {
        name: 'test-openai',
        type: 'openai',
        model: 'gpt-3.5-turbo',
        apiKeyEnv: 'OPENAI_API_KEY',
        timeout: 30000
      };

      // Mock environment variable
      const originalApiKey = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = 'test-api-key';

      const provider = ProviderFactory.createProvider(config);
      
      expect(provider).toBeInstanceOf(OpenAIProvider);
      expect(provider.config.name).toBe('test-openai');
      expect(provider.model).toBe('gpt-3.5-turbo');

      // Restore original API key
      if (originalApiKey) {
        process.env.OPENAI_API_KEY = originalApiKey;
      } else {
        delete process.env.OPENAI_API_KEY;
      }
    });

    test('should throw error for unsupported provider type', () => {
      const config = {
        name: 'test-invalid',
        type: 'unsupported-type',
        model: 'some-model'
      };

      expect(() => {
        ProviderFactory.createProvider(config);
      }).toThrow('Unsupported provider type: unsupported-type');
    });

    test('should throw error for missing configuration', () => {
      expect(() => {
        ProviderFactory.createProvider(null);
      }).toThrow('Provider configuration must include a type');

      expect(() => {
        ProviderFactory.createProvider({});
      }).toThrow('Provider configuration must include a type');
    });

    test('should throw error for missing provider type', () => {
      const config = {
        name: 'test-provider',
        model: 'some-model'
      };

      expect(() => {
        ProviderFactory.createProvider(config);
      }).toThrow('Provider configuration must include a type');
    });
  });

  describe('getSupportedProviders', () => {
    test('should return array of supported provider types', () => {
      const supportedTypes = ProviderFactory.getSupportedProviders();
      
      expect(Array.isArray(supportedTypes)).toBe(true);
      expect(supportedTypes).toContain('ollama');
      expect(supportedTypes).toContain('openai');
      expect(supportedTypes.length).toBeGreaterThan(0);
    });
  });

  describe('validateConfig', () => {
    test('should validate valid Ollama configuration', () => {
      const config = {
        type: 'ollama',
        url: 'http://localhost:11434',
        model: 'phi3:mini'
      };

      const result = ProviderFactory.validateConfig(config);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should return errors for invalid configuration', () => {
      const config = {
        type: 'ollama'
        // Missing URL
      };

      const result = ProviderFactory.validateConfig(config);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Ollama provider requires a URL');
    });

    test('should return errors for missing configuration', () => {
      const result = ProviderFactory.validateConfig(null);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Configuration is required');
    });
  });
});
