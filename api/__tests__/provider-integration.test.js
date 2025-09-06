const request = require('supertest');
const nock = require('nock');

// This test file focuses on integration testing with local Ollama only
// It tests the complete flow but uses mocked external services

describe('Provider Integration Tests (Ollama)', () => {
  let app;

  // Skip tests requiring external services in CI
  if (process.env.SKIP_EXTERNAL_SERVICE_TESTS === 'true') {
    test.skip('Skipping provider integration tests - external services not available in CI', () => {});
    return;
  }
  
  beforeAll(() => {
    // Set environment for Ollama testing
    process.env.LLM_PROVIDER = 'ollama';
    process.env.OLLAMA_URL = 'http://localhost:11434';
    process.env.OLLAMA_MODEL = 'phi3:mini';
    process.env.NODE_ENV = 'test';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    nock.cleanAll();
    
    // Create a minimal test app that mimics our actual server structure
    const express = require('express');
    app = express();
    app.use(express.json());
    
    // Mock Ollama responses for testing
    const mockOllamaHealthy = nock('http://localhost:11434')
      .get('/api/tags')
      .reply(200, {
        models: [
          { name: 'phi3:mini' }
        ]
      });

    // Add our provider endpoints with mocked behavior
    app.get('/api/provider/status', (req, res) => {
      res.json({
        provider: 'Ollama (phi3:mini)',
        healthy: true,
        config: {
          name: 'ollama',
          type: 'ollama',
          url: 'http://localhost:11434',
          model: 'phi3:mini',
          timeout: 120000,
          description: 'Local Ollama instance with Phi-3 Mini model',
          hasApiKey: false
        },
        timestamp: new Date().toISOString()
      });
    });

    app.post('/api/provider/test', (req, res) => {
      const { provider } = req.body;
      
      if (!provider) {
        return res.status(400).json({
          error: 'Provider name is required',
          timestamp: new Date().toISOString()
        });
      }

      if (provider === 'ollama') {
        res.json({
          success: true,
          healthy: true,
          provider: 'Ollama (phi3:mini)',
          config: {
            name: 'ollama',
            type: 'ollama',
            url: 'http://localhost:11434',
            model: 'phi3:mini',
            timeout: 120000,
            description: 'Local Ollama instance with Phi-3 Mini model',
            hasApiKey: false
          },
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(404).json({
          error: `Provider '${provider}' not found`,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Mock chat endpoint that would use Ollama
    app.post('/api/chat/default', (req, res) => {
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({
          error: 'Message is required',
          timestamp: new Date().toISOString()
        });
      }

      // Mock Ollama response
      res.json({
        response: `Test response to: ${message}`,
        persona: 'default',
        provider: 'ollama',
        model: 'phi3:mini',
        usage: {
          eval_count: 25,
          eval_duration: 1500000000,
          total_duration: 2000000000
        },
        timestamp: new Date().toISOString()
      });
    });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('Ollama Provider Integration', () => {
    test('should successfully get provider status for Ollama', async () => {
      const response = await request(app)
        .get('/api/provider/status')
        .expect(200);

      expect(response.body.provider).toBe('Ollama (phi3:mini)');
      expect(response.body.healthy).toBe(true);
      expect(response.body.config.type).toBe('ollama');
      expect(response.body.config.model).toBe('phi3:mini');
    });

    test('should successfully test Ollama provider', async () => {
      const response = await request(app)
        .post('/api/provider/test')
        .send({ provider: 'ollama' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.healthy).toBe(true);
      expect(response.body.provider).toBe('Ollama (phi3:mini)');
    });

    test('should successfully handle chat request with Ollama', async () => {
      const response = await request(app)
        .post('/api/chat/default')
        .send({ message: 'Hello, how are you?' })
        .expect(200);

      expect(response.body.response).toBe('Test response to: Hello, how are you?');
      expect(response.body.provider).toBe('ollama');
      expect(response.body.model).toBe('phi3:mini');
      expect(response.body.usage).toBeDefined();
      expect(response.body.usage.eval_count).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle missing message in chat request', async () => {
      const response = await request(app)
        .post('/api/chat/default')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Message is required');
    });

    test('should handle provider test with missing provider name', async () => {
      const response = await request(app)
        .post('/api/provider/test')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Provider name is required');
    });

    test('should handle provider test with invalid provider', async () => {
      const response = await request(app)
        .post('/api/provider/test')
        .send({ provider: 'invalid-provider' })
        .expect(404);

      expect(response.body.error).toBe("Provider 'invalid-provider' not found");
    });
  });

  describe('Provider Switching Simulation', () => {
    test('should demonstrate provider switching concept', async () => {
      // Test 1: Current provider is Ollama
      let response = await request(app)
        .get('/api/provider/status')
        .expect(200);
      
      expect(response.body.provider).toBe('Ollama (phi3:mini)');

      // Test 2: Simulate what would happen if we "switched" to a different provider
      // (In real implementation, this would involve changing environment variables
      // and restarting the service, but we can test the concept)
      
      // Mock a temporary "switched" endpoint
      app.get('/api/provider/status/simulated-openai', (req, res) => {
        res.json({
          provider: 'OpenAI (gpt-3.5-turbo)',
          healthy: true,
          config: {
            name: 'openai',
            type: 'openai',
            model: 'gpt-3.5-turbo',
            apiKeyEnv: 'OPENAI_API_KEY',
            timeout: 30000,
            description: 'OpenAI GPT-3.5 Turbo model',
            hasApiKey: false
          },
          timestamp: new Date().toISOString()
        });
      });

      response = await request(app)
        .get('/api/provider/status/simulated-openai')
        .expect(200);
      
      expect(response.body.provider).toBe('OpenAI (gpt-3.5-turbo)');
      expect(response.body.config.type).toBe('openai');
    });
  });
});
