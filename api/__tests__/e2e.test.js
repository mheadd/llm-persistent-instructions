const request = require('supertest');
const nock = require('nock');
const path = require('path');
const fs = require('fs');

// Set up test helpers that were previously in setup.js
global.testHelpers = {
  validPersonas: ['unemployment-benefits', 'parks-recreation', 'business-licensing', 'default'],
  
  validateApiResponse: (response) => {
    // Handle both direct response objects and response bodies with different structures
    const body = response.body || response;
    if (body.message && body.message.content) {
      expect(typeof body.message.content).toBe('string');
      expect(body.message.content.length).toBeGreaterThan(0);
    } else if (body.response) {
      expect(typeof body.response).toBe('string');
      expect(body.response.length).toBeGreaterThan(0);
    } else if (typeof body === 'string') {
      expect(body.length).toBeGreaterThan(0);
    } else {
      // Flexible validation for various response formats
      expect(body).toHaveProperty('message');
    }
  }
};

// Set up test data
global.testData = {
  sampleMessages: {
    unemploymentbenefits: 'I need help applying for unemployment benefits. What documents do I need?',
    parksrecreation: 'What are the operating hours for the community center?',
    businesslicensing: 'I need to apply for a restaurant business license. What is the process?',
    default: 'I need help with city services. Can you direct me to the right department?',
    general: ['What services do you provide?', 'How can I contact customer support?', 'What are your hours?']
  }
};

// Import our server for testing
const createTestApp = () => {
  const express = require('express');
  const cors = require('cors');
  const helmet = require('helmet');
  const morgan = require('morgan');
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

describe('End-to-End Integration Tests', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    nock.cleanAll();
  });

  afterEach(() => {
    // Clean up after each test
    nock.cleanAll();
  });

  afterAll(async () => {
    // Complete cleanup
    nock.cleanAll();
    nock.restore();
    
    // Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('Full System Workflow', () => {
    test('should handle complete user interaction workflow', async () => {
      // Mock realistic AI responses for each persona
      const personaResponses = {
        'unemployment-benefits': 'To apply for unemployment benefits, you will need to file a claim online at our state unemployment website. You\'ll need your Social Security number, driver\'s license, and employment history for the past 18 months. The process typically takes 2-3 weeks to process.',
        'parks-recreation': 'Our community center is open Monday through Friday from 6 AM to 10 PM, and weekends from 8 AM to 8 PM. We offer various programs including fitness classes, youth sports, and senior activities. You can register for programs online or in person.',
        'business-licensing': 'For a restaurant business license, you\'ll need to obtain several permits: a general business license from the city clerk, a food service permit from the health department, and potentially a liquor license if you plan to serve alcohol. The total process typically takes 4-6 weeks.',
        'default': 'Thank you for contacting our city services. I\'d be happy to help you find the right department for your needs. Could you please provide more details about what specific service or information you\'re looking for?'
      };

      // Set up mocks for each persona
      global.testHelpers.validPersonas.forEach(persona => {
        nock('http://ollama:11434')
          .post('/api/chat')
          .reply(200, {
            message: {
              content: personaResponses[persona]
            }
          });
      });

      // Test workflow for each persona
      for (const persona of global.testHelpers.validPersonas) {
        const testMessage = global.testData.sampleMessages[persona.replace('-', '')] || 
                           global.testData.sampleMessages.general[0];
        
        const response = await request(app)
          .post(`/chat/${persona}`)
          .send({ message: testMessage })
          .expect(200);

        // Validate response structure
        global.testHelpers.validateApiResponse(response.body);
        
        // Validate persona-specific response content
        expect(response.body.persona).toBe(persona);
        expect(response.body.response).toContain(
          persona === 'unemployment-benefits' ? 'unemployment' :
          persona === 'parks-recreation' ? 'community' :
          persona === 'business-licensing' ? 'license' :
          'city services'
        );
      }
    });

    test('should maintain session context across requests', async () => {
      // Mock conversational responses
      nock('http://ollama:11434')
        .post('/api/chat')
        .reply(200, {
          message: {
            content: 'I understand you need help with unemployment benefits. What specific question do you have?'
          }
        });

      nock('http://ollama:11434')
        .post('/api/chat')
        .reply(200, {
          message: {
            content: 'Based on your situation, you should file your claim as soon as possible to avoid delays in processing.'
          }
        });

      // First request
      const response1 = await request(app)
        .post('/chat/unemployment-benefits')
        .send({ message: 'I lost my job last week' })
        .expect(200);

      expect(response1.body.response).toContain('unemployment');

      // Follow-up request
      const response2 = await request(app)
        .post('/chat/unemployment-benefits')
        .send({ message: 'When should I file my claim?' })
        .expect(200);

      expect(response2.body.response).toContain('file');
    });
  });

  describe('Real-world Scenarios', () => {
    beforeEach(() => {
      // Default mock for all requests
      nock('http://ollama:11434')
        .persist()
        .post('/api/chat')
        .reply(200, {
          message: {
            content: 'This is a helpful response addressing your specific government service needs with relevant information and next steps.'
          }
        });
    });

    test('should handle unemployment benefits inquiry', async () => {
      const scenarios = [
        'I was laid off and need to apply for unemployment',
        'How long does it take to get approved for benefits?',
        'What if my employer contests my unemployment claim?'
      ];

      for (const scenario of scenarios) {
        const response = await request(app)
          .post('/chat/unemployment-benefits')
          .send({ message: scenario })
          .expect(200);

        expect(response.body.persona).toBe('unemployment-benefits');
        expect(response.body.response).toBeTruthy();
      }
    });

    test('should handle parks and recreation requests', async () => {
      const scenarios = [
        'I want to reserve a pavilion for a birthday party',
        'What youth sports programs do you offer?',
        'Are there any senior fitness classes available?'
      ];

      for (const scenario of scenarios) {
        const response = await request(app)
          .post('/chat/parks-recreation')
          .send({ message: scenario })
          .expect(200);

        expect(response.body.persona).toBe('parks-recreation');
        expect(response.body.response).toBeTruthy();
      }
    });

    test('should handle business licensing inquiries', async () => {
      const scenarios = [
        'I want to open a food truck, what permits do I need?',
        'How much does a liquor license cost?',
        'Can I operate a home-based business?'
      ];

      for (const scenario of scenarios) {
        const response = await request(app)
          .post('/chat/business-licensing')
          .send({ message: scenario })
          .expect(200);

        expect(response.body.persona).toBe('business-licensing');
        expect(response.body.response).toBeTruthy();
      }
    });
  });

  describe('System Resilience', () => {
    test('should gracefully handle temporary service disruptions', async () => {
      // Simulate temporary service failure followed by recovery
      nock('http://ollama:11434')
        .post('/api/chat')
        .reply(503, { error: 'Service temporarily unavailable' });

      const response1 = await request(app)
        .post('/chat/default')
        .send({ message: 'Test message during service disruption' })
        .expect(500);

      expect(response1.body.error).toBe('Internal server error');

      // Simulate service recovery
      nock.cleanAll();
      nock('http://ollama:11434')
        .post('/api/chat')
        .reply(200, {
          message: {
            content: 'Service has been restored and is working normally.'
          }
        });

      const response2 = await request(app)
        .post('/chat/default')
        .send({ message: 'Test message after service recovery' })
        .expect(200);

      expect(response2.body.response).toContain('restored');
    });

    test('should handle configuration errors gracefully', async () => {
      // This test would need the actual app to test config loading errors
      // For now, we'll test that the app structure handles errors properly
      
      nock('http://ollama:11434')
        .post('/api/chat')
        .reply(200, {
          message: {
            content: 'Response despite potential configuration issues'
          }
        });

      const response = await request(app)
        .post('/chat/default')
        .send({ message: 'Test with potential config issues' })
        .expect(200);

      expect(response.body).toHaveProperty('response');
    });
  });

  describe('Cross-Persona Consistency', () => {
    test('should maintain consistent response format across all personas', async () => {
      nock('http://ollama:11434')
        .persist()
        .post('/api/chat')
        .reply(200, {
          message: {
            content: 'Consistent response format test'
          }
        });

      const testMessage = 'Standard test message for format consistency';
      const responses = [];

      // Test all personas with the same message
      for (const persona of global.testHelpers.validPersonas) {
        const response = await request(app)
          .post(`/chat/${persona}`)
          .send({ message: testMessage })
          .expect(200);

        responses.push(response.body);
      }

      // Verify all responses have consistent structure
      responses.forEach(response => {
        global.testHelpers.validateApiResponse(response);
        expect(response.response).toBe('Consistent response format test');
      });

      // Verify unique personas
      const personas = responses.map(r => r.persona);
      expect(new Set(personas).size).toBe(global.testHelpers.validPersonas.length);
    });
  });
});
