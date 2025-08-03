const OllamaProvider = require('./ollama-provider');
const OpenAIProvider = require('./openai-provider');

/**
 * Provider Factory
 * 
 * Creates and manages LLM provider instances based on configuration.
 * Supports multiple providers and handles provider-specific initialization.
 */
class ProviderFactory {
  static supportedProviders = {
    'ollama': OllamaProvider,
    'openai': OpenAIProvider
    // Future providers can be added here:
    // 'anthropic': AnthropicProvider,
    // 'azure': AzureProvider,
    // 'huggingface': HuggingFaceProvider
  };

  /**
   * Create a provider instance based on configuration
   * @param {Object} config - Provider configuration object
   * @returns {BaseLLMProvider} Provider instance
   */
  static createProvider(config) {
    if (!config || !config.type) {
      throw new Error('Provider configuration must include a type');
    }

    const providerType = config.type.toLowerCase();
    const ProviderClass = this.supportedProviders[providerType];

    if (!ProviderClass) {
      throw new Error(
        `Unsupported provider type: ${config.type}. ` +
        `Supported providers: ${this.getSupportedProviders().join(', ')}`
      );
    }

    try {
      console.log(`🏭 Creating ${providerType} provider instance`);
      return new ProviderClass(config);
    } catch (error) {
      throw new Error(`Failed to create ${providerType} provider: ${error.message}`);
    }
  }

  /**
   * Get list of supported provider types
   * @returns {Array<string>} List of provider type names
   */
  static getSupportedProviders() {
    return Object.keys(this.supportedProviders);
  }

  /**
   * Validate provider configuration
   * @param {Object} config - Configuration to validate
   * @returns {Object} Validation result with isValid and errors
   */
  static validateConfig(config) {
    const errors = [];

    if (!config) {
      errors.push('Configuration is required');
      return { isValid: false, errors };
    }

    if (!config.type) {
      errors.push('Provider type is required');
    } else if (!this.supportedProviders[config.type.toLowerCase()]) {
      errors.push(`Unsupported provider type: ${config.type}`);
    }

    // Provider-specific validation
    const providerType = config.type?.toLowerCase();
    
    switch (providerType) {
      case 'ollama':
        if (!config.url) {
          errors.push('Ollama provider requires a URL');
        }
        break;
        
      case 'openai':
        const hasApiKey = config.apiKey || 
                         process.env[config.apiKeyEnv] || 
                         process.env.OPENAI_API_KEY;
        if (!hasApiKey) {
          errors.push('OpenAI provider requires an API key');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create provider with automatic fallback to default if creation fails
   * @param {Object} primaryConfig - Primary provider configuration
   * @param {Object} fallbackConfig - Fallback provider configuration
   * @returns {BaseLLMProvider} Provider instance
   */
  static createProviderWithFallback(primaryConfig, fallbackConfig = null) {
    try {
      return this.createProvider(primaryConfig);
    } catch (error) {
      console.warn(`Failed to create primary provider (${primaryConfig?.type}): ${error.message}`);
      
      if (fallbackConfig) {
        console.log(`Attempting to create fallback provider (${fallbackConfig.type})`);
        try {
          return this.createProvider(fallbackConfig);
        } catch (fallbackError) {
          console.error(`Fallback provider also failed: ${fallbackError.message}`);
          throw new Error(`Both primary and fallback providers failed to initialize`);
        }
      }
      
      throw error;
    }
  }

  /**
   * Test provider connectivity
   * @param {Object} config - Provider configuration
   * @returns {Promise<Object>} Test result with status and details
   */
  static async testProvider(config) {
    try {
      const provider = this.createProvider(config);
      const isHealthy = await provider.healthCheck();
      
      return {
        success: true,
        healthy: isHealthy,
        provider: provider.getProviderName(),
        config: provider.getConfigSummary()
      };
    } catch (error) {
      return {
        success: false,
        healthy: false,
        error: error.message,
        config: config
      };
    }
  }
}

module.exports = ProviderFactory;
