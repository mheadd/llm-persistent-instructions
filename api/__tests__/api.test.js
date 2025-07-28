const request = require('supertest');
const nock = require('nock');

// We'll need to create a test version of our app
const createTestApp = () => {
  const express = require('express');
  const cors = require('cors');
  const helmet = require('helmet');
  const morgan = require('morgan');
  const fs = require('fs');
  const path = require('path');
  const yaml = require('js-yaml');
  const axios = require('axios');

  const app = express();

  // Middleware
  app.use(cors());
  app.use(helmet());
  app.use(morgan('combined'));
  app.use(express.json());

  // Load persona configuration
  function loadPersonaConfig(persona) {
    const configPath = path.join(__dirname, '..', 'config', `${persona}.yaml`);
    
    try {
      if (!fs.existsSync(configPath)) {
        throw new Error(`Configuration file not found: ${configPath}`);
      }
      
      const configContent = fs.readFileSync(configPath, 'utf8');
      const config = yaml.load(configContent);
      
      if (!config.system_prompt) {
        throw new Error('Configuration missing required system_prompt');
      }
      
      return config;
    } catch (error) {
      console.error(`Error loading persona config for ${persona}:`, error.message);
      throw error;
    }
  }

  // Generate response function
  async function generateResponse(persona, userMessage) {
    try {
      const config = loadPersonaConfig(persona);
      
      let systemPrompt = config.system_prompt;
      
      if (config.examples && config.examples.length > 0) {
        systemPrompt += "\n\nHere are some examples of how to respond:\n";
        config.examples.forEach((example, index) => {
          systemPrompt += `\nExample ${index + 1}: ${example}`;
        });
      }
      
      const messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user', 
          content: userMessage
        }
      ];
      
      const response = await axios.post('http://ollama:11434/api/chat', {
        model: 'phi3',
        messages: messages,
        stream: false
      }, {
        timeout: 120000
      });
      
      return response.data.message.content;
    } catch (error) {
      console.error('Error generating response:', error.message);
      throw error;
    }
  }

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // API endpoints for each persona
  const personas = ['unemployment-benefits', 'parks-recreation', 'business-licensing', 'default'];
  
  personas.forEach(persona => {
    app.post(`/chat/${persona}`, async (req, res) => {
      try {
        const { message } = req.body;
        
        if (!message) {
          return res.status(400).json({ error: 'Message is required' });
        }
        
        const response = await generateResponse(persona, message);
        
        res.json({
          persona: persona,
          response: response,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error(`Error in ${persona} endpoint:`, error.message);
        res.status(500).json({ 
          error: 'Internal server error',
          message: error.message 
        });
      }
    });
  });

  return app;
};

describe('API Integration Tests', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    // Clean up any pending nock interceptors
    nock.cleanAll();
  });

  afterEach(() => {
    // Ensure all nock interceptors are cleaned up
    nock.cleanAll();
  });

  afterAll(async () => {
    // Complete cleanup and restore HTTP
    nock.cleanAll();
    nock.restore();
    
    // Wait a bit for any pending operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('Health Check', () => {
    test('GET /health should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Chat Endpoints', () => {
    const personas = ['unemployment-benefits', 'parks-recreation', 'business-licensing', 'default'];

    beforeEach(() => {
      // Mock Ollama API response
      nock('http://ollama:11434')
        .post('/api/chat')
        .reply(200, {
          message: {
            content: 'This is a mocked response from the AI model.'
          }
        });
    });

    test.each(personas)('POST /chat/%s should handle valid requests', async (persona) => {
      const testMessage = 'Hello, I need help with my request.';
      
      const response = await request(app)
        .post(`/chat/${persona}`)
        .send({ message: testMessage })
        .expect(200);
      
      expect(response.body).toHaveProperty('persona', persona);
      expect(response.body).toHaveProperty('response');
      expect(response.body).toHaveProperty('timestamp');
      expect(typeof response.body.response).toBe('string');
    });

    test.each(personas)('POST /chat/%s should reject requests without message', async (persona) => {
      const response = await request(app)
        .post(`/chat/${persona}`)
        .send({})
        .expect(400);
      
      expect(response.body).toHaveProperty('error', 'Message is required');
    });

    test.each(personas)('POST /chat/%s should handle Ollama service errors', async (persona) => {
      // Clear previous mocks and set up error response
      nock.cleanAll();
      nock('http://ollama:11434')
        .post('/api/chat')
        .reply(500, { error: 'Internal server error' });
      
      const response = await request(app)
        .post(`/chat/${persona}`)
        .send({ message: 'Test message' })
        .expect(500);
      
      expect(response.body).toHaveProperty('error', 'Internal server error');
    });

    test('should handle timeout errors gracefully', async () => {
      // Mock a timeout scenario
      nock.cleanAll();
      nock('http://ollama:11434')
        .post('/api/chat')
        .delay(125000) // Longer than our 120 second timeout
        .reply(200, { message: { content: 'Response' } });
      
      const response = await request(app)
        .post('/chat/default')
        .send({ message: 'Test message' })
        .expect(500);
      
      expect(response.body).toHaveProperty('error', 'Internal server error');
    });
  });

  describe('Request Validation', () => {
    test('should reject requests with empty message string', async () => {
      const response = await request(app)
        .post('/chat/default')
        .send({ message: '' })
        .expect(400);
      
      expect(response.body).toHaveProperty('error', 'Message is required');
    });

    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/chat/default')
        .send('invalid json')
        .expect(400);
    });

    test('should handle requests to non-existent endpoints', async () => {
      await request(app)
        .post('/chat/non-existent-persona')
        .send({ message: 'Test' })
        .expect(404);
    });
  });

  describe('Response Format', () => {
    beforeEach(() => {
      nock('http://ollama:11434')
        .post('/api/chat')
        .reply(200, {
          message: {
            content: 'Mock AI response for testing.'
          }
        });
    });

    test('should return consistent response format', async () => {
      const response = await request(app)
        .post('/chat/default')
        .send({ message: 'Test message' })
        .expect(200);
      
      // Check response structure
      expect(response.body).toMatchObject({
        persona: expect.any(String),
        response: expect.any(String),
        timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
      });
    });

    test('should include proper headers', async () => {
      const response = await request(app)
        .post('/chat/default')
        .send({ message: 'Test message' })
        .expect(200);
      
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });
});
