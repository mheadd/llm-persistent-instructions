const BaseLLMProvider = require('./base-provider');
const OpenAI = require('openai');

/**
 * OpenAI Provider Implementation
 * 
 * Handles communication with OpenAI's API (GPT-3.5, GPT-4, etc.)
 * Supports chat completions and various OpenAI models.
 */
class OpenAIProvider extends BaseLLMProvider {
  constructor(config) {
    super(config);
    
    // Get API key from multiple sources in order of preference:
    // 1. Direct config.apiKey
    // 2. Environment variable specified in config.apiKeyEnv
    // 3. Default OPENAI_API_KEY environment variable
    const apiKey = config.apiKey || 
                   (config.apiKeyEnv && process.env[config.apiKeyEnv]) || 
                   process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error(
        'OpenAI API key is required. Set OPENAI_API_KEY environment variable, ' +
        'or provide apiKey in config, or set the environment variable specified in apiKeyEnv'
      );
    }
    
    this.client = new OpenAI({
      apiKey: apiKey,
      timeout: config.timeout || 30000
    });
    
    // Use environment variable override if available
    this.model = process.env.OPENAI_MODEL || config.model || 'gpt-3.5-turbo';
    this.maxRetries = config.maxRetries || 3;
    
    console.log(`🔧 OpenAI provider initialized with model: ${this.model}`);
  }

  /**
   * Generate response from OpenAI
   * @param {string} prompt - The complete prompt
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Response object
   */
  async generateResponse(prompt, options = {}) {
    try {
      const validatedOptions = this.validateOptions(options);
      
      console.log(`🤖 Generating response with OpenAI model: ${this.model}`);
      
      // Convert single prompt to chat format
      const messages = this.convertPromptToMessages(prompt);
      
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: messages,
        temperature: validatedOptions.temperature,
        max_tokens: validatedOptions.maxTokens,
        top_p: validatedOptions.topP,
        stop: validatedOptions.stop || null,
        presence_penalty: validatedOptions.presencePenalty || 0,
        frequency_penalty: validatedOptions.frequencyPenalty || 0
      });

      if (!response.choices || response.choices.length === 0) {
        throw new Error('No response generated from OpenAI');
      }

      const choice = response.choices[0];
      
      return {
        text: choice.message.content.trim(),
        provider: 'openai',
        model: this.model,
        usage: {
          prompt_tokens: response.usage?.prompt_tokens || 0,
          completion_tokens: response.usage?.completion_tokens || 0,
          total_tokens: response.usage?.total_tokens || 0
        },
        metadata: {
          finish_reason: choice.finish_reason,
          response_id: response.id,
          created: response.created
        }
      };
    } catch (error) {
      console.error('OpenAI API error:', error.message);
      
      if (error.status) {
        switch (error.status) {
          case 401:
            throw new Error('Invalid OpenAI API key');
          case 429:
            throw new Error('OpenAI rate limit exceeded. Please try again later.');
          case 500:
          case 502:
          case 503:
            throw new Error('OpenAI service temporarily unavailable');
          default:
            throw new Error(`OpenAI API error: ${error.status} - ${error.message}`);
        }
      }
      
      throw new Error(`OpenAI service error: ${error.message}`);
    }
  }

  /**
   * Convert a single prompt to OpenAI chat message format
   * @param {string} prompt - The prompt to convert
   * @returns {Array} Array of message objects
   */
  convertPromptToMessages(prompt) {
    // Try to parse if the prompt contains conversation structure
    const lines = prompt.split('\n');
    const messages = [];
    
    // Look for system prompt at the beginning
    let systemPrompt = '';
    let conversationStart = 0;
    
    // Extract system prompt (everything before first "Human:" or "User:")
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('Human:') || line.startsWith('User:')) {
        conversationStart = i;
        break;
      }
      if (line && !line.startsWith('Example')) {
        systemPrompt += line + '\n';
      }
    }
    
    if (systemPrompt.trim()) {
      messages.push({
        role: 'system',
        content: systemPrompt.trim()
      });
    }
    
    // Parse conversation from the remaining content
    let currentMessage = '';
    let currentRole = null;
    
    for (let i = conversationStart; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.trim().startsWith('Human:') || line.trim().startsWith('User:')) {
        // Save previous message if exists
        if (currentRole && currentMessage.trim()) {
          messages.push({
            role: currentRole,
            content: currentMessage.trim()
          });
        }
        
        currentRole = 'user';
        currentMessage = line.replace(/^(Human:|User:)/, '').trim();
      } else if (line.trim().startsWith('Assistant:')) {
        // Save previous message if exists
        if (currentRole && currentMessage.trim()) {
          messages.push({
            role: currentRole,
            content: currentMessage.trim()
          });
        }
        
        currentRole = 'assistant';
        currentMessage = line.replace(/^Assistant:/, '').trim();
      } else {
        // Continue current message
        currentMessage += '\n' + line;
      }
    }
    
    // Add the final message
    if (currentRole && currentMessage.trim()) {
      messages.push({
        role: currentRole,
        content: currentMessage.trim()
      });
    }
    
    // If no proper conversation structure was found, treat entire prompt as user message
    if (messages.length === 0 || (messages.length === 1 && messages[0].role === 'system')) {
      messages.push({
        role: 'user',
        content: systemPrompt || prompt
      });
    }
    
    return messages;
  }

  /**
   * Check OpenAI service health
   * @returns {Promise<boolean>} True if healthy
   */
  async healthCheck() {
    try {
      await this.client.models.list();
      return true;
    } catch (error) {
      console.error('OpenAI health check failed:', error.message);
      return false;
    }
  }

  /**
   * Get provider display name
   * @returns {string} Provider name
   */
  getProviderName() {
    return `OpenAI (${this.model})`;
  }

  /**
   * Get available models from OpenAI
   * @returns {Promise<Array>} List of available models
   */
  async getAvailableModels() {
    try {
      const response = await this.client.models.list();
      return response.data
        .filter(model => model.id.includes('gpt'))
        .map(model => ({
          id: model.id,
          created: model.created,
          owned_by: model.owned_by
        }));
    } catch (error) {
      console.error('Failed to get OpenAI models:', error.message);
      return [];
    }
  }
}

module.exports = OpenAIProvider;
