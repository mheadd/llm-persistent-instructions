/**
 * Environment Configuration Validator
 * 
 * Validates and provides environment-specific configuration
 */
class EnvironmentConfig {
  constructor() {
    this.env = process.env.NODE_ENV || 'development';
    this.isDevelopment = this.env === 'development';
    this.isProduction = this.env === 'production';
    this.isTest = this.env === 'test';
  }

  /**
   * Validate required environment variables
   * @returns {Object} Validation result
   */
  validate() {
    const errors = [];
    const warnings = [];

    // Required for all environments
    if (!process.env.PORT) {
      warnings.push('PORT not set, using default 3000');
    }

    // LLM Provider validation
    const provider = process.env.LLM_PROVIDER;
    if (!provider) {
      warnings.push('LLM_PROVIDER not set, using default from config');
    } else {
      // Provider-specific validation
      switch (provider.toLowerCase()) {
        case 'openai':
        case 'openai-gpt4':
          if (!process.env.OPENAI_API_KEY) {
            errors.push('OPENAI_API_KEY is required when using OpenAI provider');
          }
          break;
        case 'anthropic':
          if (!process.env.ANTHROPIC_API_KEY) {
            errors.push('ANTHROPIC_API_KEY is required when using Anthropic provider');
          }
          break;
        case 'azure':
          if (!process.env.AZURE_OPENAI_API_KEY) {
            errors.push('AZURE_OPENAI_API_KEY is required when using Azure provider');
          }
          if (!process.env.AZURE_OPENAI_ENDPOINT) {
            errors.push('AZURE_OPENAI_ENDPOINT is required when using Azure provider');
          }
          break;
        case 'ollama':
          if (!process.env.OLLAMA_URL) {
            warnings.push('OLLAMA_URL not set, using default from config');
          }
          break;
      }
    }

    // Development-specific warnings
    if (this.isDevelopment) {
      if (!process.env.OLLAMA_URL && provider !== 'openai') {
        warnings.push('Consider setting OLLAMA_URL for local development');
      }
    }

    // Production-specific validations
    if (this.isProduction) {
      if (provider === 'ollama' && !process.env.OLLAMA_URL) {
        warnings.push('OLLAMA_URL should be explicitly set in production');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      environment: this.env
    };
  }

  /**
   * Get environment-specific configuration
   * @returns {Object} Configuration object
   */
  getConfig() {
    return {
      environment: this.env,
      isDevelopment: this.isDevelopment,
      isProduction: this.isProduction,
      isTest: this.isTest,
      port: parseInt(process.env.PORT) || 3000,
      logLevel: process.env.LOG_LEVEL || (this.isDevelopment ? 'debug' : 'info'),
      logProviderUsage: process.env.LOG_PROVIDER_USAGE === 'true',
      logResponseTimes: process.env.LOG_RESPONSE_TIMES === 'true',
      timeouts: {
        healthCheck: parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 5000,
        generation: parseInt(process.env.GENERATION_TIMEOUT) || 120000
      },
      retries: {
        maxRetries: parseInt(process.env.MAX_RETRIES) || 3,
        retryDelay: parseInt(process.env.RETRY_DELAY) || 1000
      }
    };
  }

  /**
   * Print environment summary to console
   */
  printSummary() {
    const validation = this.validate();
    const config = this.getConfig();

    console.log(`🌍 Environment: ${config.environment.toUpperCase()}`);
    console.log(`📊 Log Level: ${config.logLevel}`);
    console.log(`🚪 Port: ${config.port}`);
    
    if (process.env.LLM_PROVIDER) {
      console.log(`🤖 LLM Provider: ${process.env.LLM_PROVIDER}`);
    }

    if (validation.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      validation.warnings.forEach(warning => console.log(`   - ${warning}`));
    }

    if (validation.errors.length > 0) {
      console.log('❌ Errors:');
      validation.errors.forEach(error => console.log(`   - ${error}`));
    }

    return validation;
  }
}

module.exports = EnvironmentConfig;
