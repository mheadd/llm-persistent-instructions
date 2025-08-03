const BaseLLMProvider = require('./base-provider');
const axios = require('axios');

/**
 * Ollama Provider Implementation
 * 
 * Handles communication with local Ollama instances.
 * Supports all Ollama models including phi3:mini, llama2, etc.
 */
class OllamaProvider extends BaseLLMProvider {
  constructor(config) {
    super(config);
    
    // Validate required configuration
    if (!config.url) {
      throw new Error('Ollama URL is required in configuration');
    }
    
    // Use environment variable overrides if available
    this.url = process.env.OLLAMA_URL || config.url;
    this.model = process.env.OLLAMA_MODEL || config.model || 'phi3:mini';
    this.timeout = config.timeout || 120000;
    
    console.log(`🔧 Ollama provider initialized with URL: ${this.url}, model: ${this.model}`);
  }

  /**
   * Generate response from Ollama
   * @param {string} prompt - The complete prompt
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Response object
   */
  async generateResponse(prompt, options = {}) {
    try {
      const validatedOptions = this.validateOptions(options);
      
      console.log(`🤖 Generating response with Ollama model: ${this.model}`);
      
      const response = await axios.post(`${this.url}/api/generate`, {
        model: this.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: validatedOptions.temperature,
          top_p: validatedOptions.topP,
          num_predict: validatedOptions.maxTokens,
          stop: validatedOptions.stop || []
        }
      }, {
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.data || !response.data.response) {
        throw new Error('Invalid response format from Ollama');
      }

      return {
        text: response.data.response.trim(),
        provider: 'ollama',
        model: this.model,
        usage: {
          eval_count: response.data.eval_count || 0,
          eval_duration: response.data.eval_duration || 0,
          total_duration: response.data.total_duration || 0
        },
        metadata: {
          context: response.data.context || [],
          done: response.data.done || false
        }
      };
    } catch (error) {
      console.error('Ollama API error:', error.message);
      
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Unable to connect to Ollama service. Please ensure it is running.');
      }
      
      if (error.response) {
        throw new Error(`Ollama API error: ${error.response.status} - ${error.response.statusText}`);
      }
      
      throw new Error(`Ollama service error: ${error.message}`);
    }
  }

  /**
   * Check Ollama service health
   * @returns {Promise<boolean>} True if healthy
   */
  async healthCheck() {
    try {
      const response = await axios.get(`${this.url}/api/tags`, {
        timeout: 5000
      });
      
      return response.status === 200 && Array.isArray(response.data.models);
    } catch (error) {
      console.error('Ollama health check failed:', error.message);
      return false;
    }
  }

  /**
   * Get provider display name
   * @returns {string} Provider name
   */
  getProviderName() {
    return `Ollama (${this.model})`;
  }

  /**
   * Get available models from Ollama
   * @returns {Promise<Array>} List of available models
   */
  async getAvailableModels() {
    try {
      const response = await axios.get(`${this.url}/api/tags`, {
        timeout: 10000
      });
      
      return response.data.models || [];
    } catch (error) {
      console.error('Failed to get Ollama models:', error.message);
      return [];
    }
  }

  /**
   * Pull a model to Ollama (useful for setup)
   * @param {string} modelName - Name of the model to pull
   * @returns {Promise<boolean>} True if successful
   */
  async pullModel(modelName) {
    try {
      console.log(`📥 Pulling model: ${modelName}`);
      
      const response = await axios.post(`${this.url}/api/pull`, {
        name: modelName
      }, {
        timeout: 300000 // 5 minutes for model download
      });
      
      return response.status === 200;
    } catch (error) {
      console.error(`Failed to pull model ${modelName}:`, error.message);
      return false;
    }
  }
}

module.exports = OllamaProvider;
