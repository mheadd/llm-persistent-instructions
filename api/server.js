// Load environment variables first
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Import LLM provider components
const ProviderFactory = require('./providers/provider-factory');
const LLMConfigManager = require('./config/llm-config-manager');
const EnvironmentConfig = require('./config/environment-config');

const app = express();

// Initialize environment configuration
const envConfig = new EnvironmentConfig();
const envValidation = envConfig.printSummary();

// Exit if critical environment errors exist
if (!envValidation.isValid) {
  console.error('❌ Critical environment configuration errors detected. Exiting.');
  process.exit(1);
}

const config = envConfig.getConfig();
const PORT = config.port;

// Initialize LLM configuration and provider
let llmConfigManager;
let llmProvider;

try {
  llmConfigManager = new LLMConfigManager();
  const currentProviderConfig = llmConfigManager.getCurrentProviderConfig();
  llmProvider = ProviderFactory.createProvider(currentProviderConfig);
  
  console.log(`🤖 Initialized LLM provider: ${llmProvider.getProviderName()}`);
} catch (error) {
  console.error('❌ Failed to initialize LLM provider:', error.message);
  
  // Try fallback providers
  try {
    const fallbackConfigs = llmConfigManager?.getFallbackProviders() || [];
    for (const fallbackConfig of fallbackConfigs) {
      try {
        llmProvider = ProviderFactory.createProvider(fallbackConfig);
        console.log(`🔄 Using fallback provider: ${llmProvider.getProviderName()}`);
        break;
      } catch (fallbackError) {
        console.warn(`Fallback provider ${fallbackConfig.name} also failed: ${fallbackError.message}`);
      }
    }
  } catch (fallbackError) {
    console.error('All providers failed to initialize');
  }
  
  if (!llmProvider) {
    console.error('🚨 No LLM provider available! Server will start but chat endpoints will fail.');
  }
}

// Middleware
app.use(helmet());
app.use(cors());

// Configure logging based on environment
if (config.isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

app.use(express.json({ limit: '10mb' }));

// Configuration cache
const configCache = new Map();

/**
 * Load persona configuration from YAML file
 * @param {string} personaName - Name of the persona
 * @returns {Object} Parsed configuration object
 */
function loadPersonaConfig(personaName) {
  if (configCache.has(personaName)) {
    return configCache.get(personaName);
  }

  try {
    const configPath = path.join(__dirname, 'config', `${personaName}.yaml`);
    const configFile = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(configFile);
    
    configCache.set(personaName, config);
    console.log(`Loaded configuration for persona: ${personaName}`);
    
    return config;
  } catch (error) {
    console.error(`Failed to load configuration for persona ${personaName}:`, error.message);
    throw new Error(`Configuration not found for persona: ${personaName}`);
  }
}

/**
 * Build the full prompt with persona instructions
 * @param {Object} config - Persona configuration
 * @param {string} userMessage - User's input message
 * @returns {string} Complete prompt for the LLM
 */
function buildPrompt(config, userMessage) {
  let prompt = config.system_prompt + '\n\n';
  
  // Add examples if available
  if (config.examples && config.examples.length > 0) {
    prompt += 'Here are some examples of how to respond:\n\n';
    config.examples.forEach((example, index) => {
      prompt += `Example ${index + 1}:\n`;
      prompt += `Human: ${example.user}\n`;
      prompt += `Assistant: ${example.assistant}\n\n`;
    });
  }
  
  prompt += `Now, please respond to this user message:\nHuman: ${userMessage}\nAssistant:`;
  
  return prompt;
}

/**
 * Generate response using the configured LLM provider
 * @param {string} persona - Name of the persona
 * @param {string} userMessage - User's input message
 * @returns {Promise<Object>} AI response with metadata
 */
async function generateResponse(persona, userMessage) {
  try {
    if (!llmProvider) {
      throw new Error('No LLM provider available. Please check configuration.');
    }

    const config = loadPersonaConfig(persona);
    const fullPrompt = buildPrompt(config, userMessage);

    console.log(`🤖 Generating response for persona: ${persona} using ${llmProvider.getProviderName()}`);

    const response = await llmProvider.generateResponse(fullPrompt, {
      temperature: 0.7,
      maxTokens: 300,
      topP: 0.9
    });

    return {
      text: response.text,
      provider: response.provider,
      model: response.model,
      persona: persona,
      usage: response.usage,
      metadata: response.metadata
    };
  } catch (error) {
    console.error(`❌ Error generating response:`, error.message);
    throw new Error(`Failed to generate response: ${error.message}`);
  }
}

/**
 * Generic chat handler for all personas
 * @param {string} personaName - Name of the persona
 */
function createChatHandler(personaName) {
  return async (req, res) => {
    try {
      const { message } = req.body;
      
      if (!message || typeof message !== 'string' || message.trim() === '') {
        return res.status(400).json({
          error: 'Message is required and must be a non-empty string',
          persona: personaName
        });
      }

      // Generate response using the provider abstraction
      const aiResponse = await generateResponse(personaName, message.trim());
      
      // Return formatted response
      res.json({
        response: aiResponse.text,
        persona: personaName,
        provider: aiResponse.provider,
        model: aiResponse.model,
        usage: aiResponse.usage,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error(`Error in ${personaName} chat handler:`, error.message);
      
      res.status(500).json({
        error: 'An error occurred while processing your request',
        details: error.message,
        persona: personaName,
        timestamp: new Date().toISOString()
      });
    }
  };
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'government-ai-api',
    version: '1.0.0'
  });
});

// LLM Provider status endpoint
app.get('/api/provider/status', async (req, res) => {
  try {
    if (!llmProvider) {
      return res.status(503).json({
        provider: 'none',
        healthy: false,
        error: 'No LLM provider initialized',
        timestamp: new Date().toISOString()
      });
    }

    const isHealthy = await llmProvider.healthCheck();
    const configSummary = llmProvider.getConfigSummary();
    
    res.json({
      provider: llmProvider.getProviderName(),
      healthy: isHealthy,
      config: configSummary,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      provider: llmProvider?.getProviderName() || 'unknown',
      healthy: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// List all available providers endpoint
app.get('/api/providers', (req, res) => {
  try {
    const currentConfig = llmConfigManager?.getCurrentProviderConfig();
    const allConfigs = llmConfigManager?.getAllProviderConfigs() || {};
    const supportedProviders = ProviderFactory.getSupportedProviders();
    
    res.json({
      current: {
        name: currentConfig?.name || 'none',
        provider: llmProvider?.getProviderName() || 'none',
        healthy: llmProvider ? 'unknown' : false
      },
      available: Object.keys(allConfigs),
      supported: supportedProviders,
      configurations: Object.entries(allConfigs).reduce((acc, [name, config]) => {
        const { apiKey, api_key, ...safeConfig } = config;
        acc[name] = {
          ...safeConfig,
          hasApiKey: !!(apiKey || api_key || (config.apiKeyEnv && process.env[config.apiKeyEnv]))
        };
        return acc;
      }, {}),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get provider information',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test a specific provider endpoint
app.post('/api/provider/test', async (req, res) => {
  try {
    const { provider } = req.body;
    
    if (!provider) {
      return res.status(400).json({
        error: 'Provider name is required',
        timestamp: new Date().toISOString()
      });
    }

    const providerConfig = llmConfigManager?.getProviderConfig(provider);
    if (!providerConfig) {
      return res.status(404).json({
        error: `Provider configuration not found: ${provider}`,
        timestamp: new Date().toISOString()
      });
    }

    const testResult = await ProviderFactory.testProvider(providerConfig);
    
    res.json({
      ...testResult,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to test provider',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API information endpoint
app.get('/api', (req, res) => {
  res.json({
    service: 'Government AI Prototype API',
    version: '1.0.0',
    description: 'Persistent instruction layering demo with specialized government service personas',
    provider: {
      current: llmProvider?.getProviderName() || 'none',
      status: llmProvider ? 'initialized' : 'not available'
    },
    endpoints: {
      'POST /api/chat/unemployment-benefits': 'Unemployment benefits assistance',
      'POST /api/chat/parks-recreation': 'Parks and recreation information',
      'POST /api/chat/business-licensing': 'Business licensing guidance',
      'POST /api/chat/default': 'General purpose assistant',
      'GET /health': 'Service health check',
      'GET /api': 'API information',
      'GET /api/provider/status': 'Current provider status',
      'GET /api/providers': 'List all available providers',
      'POST /api/provider/test': 'Test a specific provider'
    },
    personas: ['unemployment-benefits', 'parks-recreation', 'business-licensing', 'default'],
    timestamp: new Date().toISOString()
  });
});

// Chat endpoints for each persona
app.post('/api/chat/unemployment-benefits', createChatHandler('unemployment-benefits'));
app.post('/api/chat/parks-recreation', createChatHandler('parks-recreation'));
app.post('/api/chat/business-licensing', createChatHandler('business-licensing'));
app.post('/api/chat/default', createChatHandler('default'));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: 'Please check the API documentation at GET /api',
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Government AI API running on port ${PORT}`);
  
  if (llmProvider) {
    console.log(`🤖 LLM Provider: ${llmProvider.getProviderName()}`);
    console.log(`⚙️  Provider Config: ${JSON.stringify(llmProvider.getConfigSummary(), null, 2)}`);
  } else {
    console.log('⚠️  No LLM provider available');
  }
  
  console.log(`📁 Config directory: ${path.join(__dirname, 'config')}`);
  console.log(`🏛️ Available personas: unemployment-benefits, parks-recreation, business-licensing, default`);
  console.log(`📡 Provider status: GET /api/provider/status`);
  console.log(`📋 All providers: GET /api/providers`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});
