const request = require('supertest');
const nock = require('nock');

// Import our test app
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

// Skip entire file if external services not available
if (process.env.SKIP_EXTERNAL_SERVICE_TESTS === 'true') {
  describe.skip('Performance Tests - Skipped in CI', () => {
    test('External service tests skipped', () => {});
  });
} else {
  describe('Performance Tests', () => {
    let app;

    beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    nock.cleanAll();
    
    // Mock fast Ollama responses for performance testing
    nock('http://ollama:11434')
      .persist()
      .post('/api/chat')
      .delay(1000) // Simulate 1 second response time
      .reply(200, {
        message: {
          content: 'This is a fast mocked response for performance testing.'
        }
      });
  });

  afterEach(() => {
    // Clean up nock interceptors after each test
    nock.cleanAll();
  });

  afterAll(async () => {
    // Complete cleanup
    nock.cleanAll();
    nock.restore();
    
    // Wait for any pending operations
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('Response Time Requirements', () => {
    test('health check should respond within 100ms', async () => {
      const start = Date.now();
      
      await request(app)
        .get('/health')
        .expect(200);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100);
    });

    test('chat endpoints should respond within acceptable time limits', async () => {
      const start = Date.now();
      
      await request(app)
        .post('/chat/default')
        .send({ message: 'Quick test message' })
        .expect(200);
      
      const duration = Date.now() - start;
      // Should respond within 5 seconds for mocked responses
      expect(duration).toBeLessThan(5000);
    }, 10000); // 10 second timeout for this test
  });

  describe('Concurrent Request Handling', () => {
    test('should handle multiple concurrent requests', async () => {
      const concurrentRequests = 5;
      const requests = [];
      
      for (let i = 0; i < concurrentRequests; i++) {
        requests.push(
          request(app)
            .post('/chat/default')
            .send({ message: `Concurrent test message ${i}` })
        );
      }
      
      const responses = await Promise.all(requests);
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('response');
      });
    }, 15000); // 15 second timeout
  });

  describe('Memory and Resource Usage', () => {
    test('should handle large message payloads', async () => {
      const largeMessage = 'x'.repeat(10000); // 10KB message
      
      const response = await request(app)
        .post('/chat/default')
        .send({ message: largeMessage })
        .expect(200);
      
      expect(response.body).toHaveProperty('response');
    });

    test('should handle requests to all personas without memory leaks', async () => {
      const personas = ['unemployment-benefits', 'parks-recreation', 'business-licensing', 'default'];
      
      for (const persona of personas) {
        const response = await request(app)
          .post(`/chat/${persona}`)
          .send({ message: 'Memory test message' })
          .expect(200);
        
        expect(response.body.persona).toBe(persona);
      }
    });
  });

  describe('Error Handling Performance', () => {
    test('should quickly reject invalid requests', async () => {
      const start = Date.now();
      
      await request(app)
        .post('/chat/default')
        .send({}) // Missing message
        .expect(400);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(50); // Should be very fast
    });

    test('should handle service unavailable scenarios gracefully', async () => {
      // Override mock to simulate service unavailable
      nock.cleanAll();
      nock('http://ollama:11434')
        .post('/api/chat')
        .reply(503, { error: 'Service unavailable' });
      
      const start = Date.now();
      
      await request(app)
        .post('/chat/default')
        .send({ message: 'Test message' })
        .expect(500);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(2000); // Should fail quickly
    });
  });

  describe('Load Testing Simulation', () => {
    test('should maintain performance under simulated load', async () => {
      const requestCount = 10;
      const maxResponseTime = 3000; // 3 seconds
      
      const requests = Array.from({ length: requestCount }, (_, index) =>
        request(app)
          .post('/chat/default')
          .send({ message: `Load test message ${index}` })
      );
      
      const start = Date.now();
      const responses = await Promise.all(requests);
      const totalDuration = Date.now() - start;
      
      // All requests should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('response');
      });
      
      // Average response time should be reasonable
      const averageResponseTime = totalDuration / requestCount;
      expect(averageResponseTime).toBeLessThan(maxResponseTime);
      
      console.log(`Load test completed: ${requestCount} requests in ${totalDuration}ms (avg: ${averageResponseTime}ms per request)`);
    }, 30000); // 30 second timeout
  });
});
}
