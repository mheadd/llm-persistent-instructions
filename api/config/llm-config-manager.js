const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * LLM Configuration Manager
 * 
 * Handles loading and managing LLM provider configurations.
 * Supports environment variable overrides and validation.
 */
class LLMConfigManager {
  constructor(configPath = null) {
    this.configPath = configPath || path.join(__dirname, 'llm-config.yaml');
    this.config = null;
    this.loadConfig();
  }

  /**
   * Load configuration from YAML file
   */
  loadConfig() {
    try {
      if (!fs.existsSync(this.configPath)) {
        throw new Error(`LLM configuration file not found: ${this.configPath}`);
      }

      const configFile = fs.readFileSync(this.configPath, 'utf8');
      this.config = yaml.load(configFile);
      
      // Apply environment variable overrides
      this.applyEnvironmentOverrides();
      
      console.log(`✅ Loaded LLM configuration from: ${this.configPath}`);
    } catch (error) {
      console.error('Failed to load LLM configuration:', error.message);
      throw error;
    }
  }

  /**
   * Apply environment variable overrides to configuration
   */
  applyEnvironmentOverrides() {
    // Override default provider if environment variable is set
    if (process.env.LLM_PROVIDER) {
      this.config.default_provider = process.env.LLM_PROVIDER;
      console.log(`🔧 Using provider from environment: ${process.env.LLM_PROVIDER}`);
    }

    // Override Ollama URL if environment variable is set
    if (process.env.OLLAMA_URL && this.config.providers.ollama) {
      this.config.providers.ollama.url = process.env.OLLAMA_URL;
      console.log(`🔧 Using Ollama URL from environment: ${process.env.OLLAMA_URL}`);
    }

    // Override model names if environment variables are set
    if (process.env.OLLAMA_MODEL && this.config.providers.ollama) {
      this.config.providers.ollama.model = process.env.OLLAMA_MODEL;
      console.log(`🔧 Using Ollama model from environment: ${process.env.OLLAMA_MODEL}`);
    }

    if (process.env.OPENAI_MODEL && this.config.providers.openai) {
      this.config.providers.openai.model = process.env.OPENAI_MODEL;
      console.log(`🔧 Using OpenAI model from environment: ${process.env.OPENAI_MODEL}`);
    }
  }

  /**
   * Get the current provider configuration
   * @returns {Object} Provider configuration object
   */
  getCurrentProviderConfig() {
    const providerName = this.config.default_provider;
    const providerConfig = this.config.providers[providerName];
    
    if (!providerConfig) {
      throw new Error(`Provider configuration not found: ${providerName}`);
    }

    return {
      name: providerName,
      ...providerConfig
    };
  }

  /**
   * Get configuration for a specific provider
   * @param {string} providerName - Name of the provider
   * @returns {Object} Provider configuration object
   */
  getProviderConfig(providerName) {
    const providerConfig = this.config.providers[providerName];
    
    if (!providerConfig) {
      throw new Error(`Provider configuration not found: ${providerName}`);
    }

    return {
      name: providerName,
      ...providerConfig
    };
  }

  /**
   * Get all available provider configurations
   * @returns {Object} All provider configurations
   */
  getAllProviderConfigs() {
    return this.config.providers;
  }

  /**
   * Get list of available provider names
   * @returns {Array<string>} List of provider names
   */
  getAvailableProviders() {
    return Object.keys(this.config.providers);
  }

  /**
   * Get fallback provider configurations in order
   * @returns {Array<Object>} Array of fallback provider configs
   */
  getFallbackProviders() {
    if (!this.config.fallback_providers) {
      return [];
    }

    return this.config.fallback_providers
      .map(name => {
        const config = this.config.providers[name];
        return config ? { name, ...config } : null;
      })
      .filter(config => config !== null);
  }

  /**
   * Get global settings
   * @returns {Object} Global settings object
   */
  getSettings() {
    return this.config.settings || {};
  }

  /**
   * Validate the configuration
   * @returns {Object} Validation result with isValid and errors
   */
  validate() {
    const errors = [];

    if (!this.config) {
      errors.push('Configuration not loaded');
      return { isValid: false, errors };
    }

    if (!this.config.default_provider) {
      errors.push('default_provider is required');
    }

    if (!this.config.providers || Object.keys(this.config.providers).length === 0) {
      errors.push('At least one provider configuration is required');
    }

    // Check if default provider exists in providers
    if (this.config.default_provider && !this.config.providers[this.config.default_provider]) {
      errors.push(`Default provider '${this.config.default_provider}' not found in providers`);
    }

    // Validate each provider configuration
    Object.entries(this.config.providers || {}).forEach(([name, config]) => {
      if (!config.type) {
        errors.push(`Provider '${name}' missing type`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Reload configuration from file
   */
  reload() {
    this.loadConfig();
  }

  /**
   * Get configuration summary for debugging
   * @returns {Object} Configuration summary without sensitive data
   */
  getSummary() {
    const summary = {
      configPath: this.configPath,
      defaultProvider: this.config?.default_provider,
      availableProviders: this.getAvailableProviders(),
      settings: this.getSettings()
    };

    // Add provider summaries without sensitive data
    summary.providers = {};
    Object.entries(this.config?.providers || {}).forEach(([name, config]) => {
      const { apiKey, api_key, ...safeConfig } = config;
      summary.providers[name] = {
        ...safeConfig,
        hasApiKey: !!(apiKey || api_key || process.env[config.apiKeyEnv])
      };
    });

    return summary;
  }
}

module.exports = LLMConfigManager;
