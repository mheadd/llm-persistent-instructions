const EnvironmentConfig = require('../config/environment-config');

describe('EnvironmentConfig', () => {
  let originalEnv;
  let envConfig;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Clear test-related env vars
    delete process.env.LLM_PROVIDER;
    delete process.env.OPENAI_API_KEY;
    delete process.env.OLLAMA_URL;
    delete process.env.NODE_ENV;
    delete process.env.PORT;
    delete process.env.LOG_LEVEL;
    
    // Create new instance for each test
    envConfig = new EnvironmentConfig();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('constructor', () => {
    test('should initialize with default development environment', () => {
      expect(envConfig.env).toBe('development');
      expect(envConfig.isDevelopment).toBe(true);
      expect(envConfig.isProduction).toBe(false);
      expect(envConfig.isTest).toBe(false);
    });

    test('should initialize with production environment when set', () => {
      process.env.NODE_ENV = 'production';
      const prodConfig = new EnvironmentConfig();
      
      expect(prodConfig.env).toBe('production');
      expect(prodConfig.isDevelopment).toBe(false);
      expect(prodConfig.isProduction).toBe(true);
      expect(prodConfig.isTest).toBe(false);
    });
  });

  describe('validate', () => {
    test('should validate with warnings when no env vars set', () => {
      const result = envConfig.validate();
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toContain('PORT not set, using default 3000');
      expect(result.warnings).toContain('LLM_PROVIDER not set, using default from config');
      expect(result.environment).toBe('development');
    });

    test('should validate OpenAI configuration correctly', () => {
      process.env.LLM_PROVIDER = 'openai';
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.PORT = '8080';

      const result = envConfig.validate();
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    test('should return error for missing OpenAI API key', () => {
      process.env.LLM_PROVIDER = 'openai';
      // Don't set OPENAI_API_KEY

      const result = envConfig.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('OPENAI_API_KEY is required when using OpenAI provider');
    });

    test('should handle Ollama configuration', () => {
      process.env.LLM_PROVIDER = 'ollama';
      process.env.OLLAMA_URL = 'http://localhost:11434';

      const result = envConfig.validate();
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should warn about missing OLLAMA_URL', () => {
      process.env.LLM_PROVIDER = 'ollama';
      // Don't set OLLAMA_URL

      const result = envConfig.validate();
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('OLLAMA_URL not set, using default from config');
    });
  });

  describe('getConfig', () => {
    test('should return configuration object with defaults', () => {
      const config = envConfig.getConfig();
      
      expect(config.environment).toBe('development');
      expect(config.isDevelopment).toBe(true);
      expect(config.port).toBe(3000);
      expect(config.logLevel).toBe('debug');
      expect(config.timeouts).toBeDefined();
      expect(config.timeouts.healthCheck).toBe(5000);
    });

    test('should return configuration with custom values', () => {
      process.env.PORT = '9000';
      process.env.LOG_LEVEL = 'info';
      process.env.LOG_PROVIDER_USAGE = 'true';

      const config = envConfig.getConfig();
      
      expect(config.port).toBe(9000);
      expect(config.logLevel).toBe('info');
      expect(config.logProviderUsage).toBe(true);
    });

    test('should handle invalid PORT gracefully', () => {
      process.env.PORT = 'not-a-number';

      const config = envConfig.getConfig();
      
      expect(config.port).toBe(3000); // Should fall back to default
    });
  });

  describe('logConfiguration', () => {
    test('should log configuration without throwing', () => {
      // This method exists in the actual implementation
      expect(() => {
        if (typeof envConfig.logConfiguration === 'function') {
          envConfig.logConfiguration({}, []);
        }
      }).not.toThrow();
    });
  });
});
