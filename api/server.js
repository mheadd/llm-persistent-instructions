const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
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
 * Send request to Ollama service
 * @param {string} prompt - Complete prompt to send
 * @returns {Promise<string>} AI response
 */
async function callOllama(prompt) {
  try {
    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: 'phi3:mini',
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 1000
      }
    }, {
      timeout: 120000, // Increased to 120 seconds for model loading
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data && response.data.response) {
      return response.data.response.trim();
    } else {
      throw new Error('Invalid response format from Ollama');
    }
  } catch (error) {
    console.error('Ollama API error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Unable to connect to Ollama service. Please ensure it is running.');
    }
    throw new Error(`Ollama service error: ${error.message}`);
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

      // Load persona configuration
      const config = loadPersonaConfig(personaName);
      
      // Build the complete prompt
      const prompt = buildPrompt(config, message.trim());
      
      // Get response from Ollama
      const aiResponse = await callOllama(prompt);
      
      // Return formatted response
      res.json({
        response: aiResponse,
        persona: personaName,
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

// API information endpoint
app.get('/api', (req, res) => {
  res.json({
    service: 'Government AI Prototype API',
    version: '1.0.0',
    description: 'Persistent instruction layering demo with specialized government service personas',
    endpoints: {
      'POST /api/chat/unemployment-benefits': 'Unemployment benefits assistance',
      'POST /api/chat/parks-recreation': 'Parks and recreation information',
      'POST /api/chat/business-licensing': 'Business licensing guidance',
      'POST /api/chat/default': 'General purpose assistant',
      'GET /health': 'Service health check',
      'GET /api': 'API information'
    },
    personas: ['unemployment-benefits', 'parks-recreation', 'business-licensing', 'default']
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
  console.log(`🔗 Ollama URL: ${OLLAMA_URL}`);
  console.log(`📁 Config directory: ${path.join(__dirname, 'config')}`);
  console.log(`🏛️ Available personas: unemployment-benefits, parks-recreation, business-licensing, default`);
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
