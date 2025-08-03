/**
 * Base LLM Provider Interface
 * 
 * All LLM providers must extend this class and implement the required methods.
 * This ensures consistent behavior across different LLM backends.
 */
class BaseLLMProvider {
  constructor(config) {
    if (!config) {
      throw new Error('Provider configuration is required');
    }
    this.config = config;
  }

  /**
   * Generate a response from the LLM
   * @param {string} prompt - The complete prompt to send to the LLM
   * @param {Object} options - Optional parameters (temperature, maxTokens, etc.)
   * @returns {Promise<Object>} Response object with text, provider, model, etc.
   */
  async generateResponse(prompt, options = {}) {
    throw new Error('generateResponse must be implemented by provider');
  }

  /**
   * Check if the provider is healthy and available
   * @returns {Promise<boolean>} True if provider is healthy, false otherwise
   */
  async healthCheck() {
    throw new Error('healthCheck must be implemented by provider');
  }

  /**
   * Get the display name of the provider
   * @returns {string} Human-readable provider name
   */
  getProviderName() {
    throw new Error('getProviderName must be implemented by provider');
  }

  /**
   * Get provider-specific configuration info (for debugging/monitoring)
   * @returns {Object} Configuration summary (without sensitive data)
   */
  getConfigSummary() {
    const { apiKey, api_key, ...safeConfig } = this.config;
    return {
      ...safeConfig,
      hasApiKey: !!(apiKey || api_key)
    };
  }

  /**
   * Validate options and set defaults
   * @param {Object} options - Input options
   * @returns {Object} Validated options with defaults
   */
  validateOptions(options = {}) {
    return {
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 300,
      topP: options.topP || 0.9,
      ...options
    };
  }
}

module.exports = BaseLLMProvider;
