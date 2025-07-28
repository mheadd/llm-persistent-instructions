// Global test setup and configuration

// Set test environment variables
process.env.NODE_ENV = 'test';

// Configure longer timeouts for integration tests involving AI models
jest.setTimeout(30000);

// Global test helpers
global.testHelpers = {
  /**
   * Create a standardized test message for different scenarios
   */
  createTestMessage: (type = 'simple') => {
    const messages = {
      simple: 'Hello, I need help with my request.',
      complex: 'I have a complex situation where I need to understand multiple requirements and deadlines. Can you help me navigate through the process step by step?',
      edge: 'What happens if I submit an incomplete application on the last day before a deadline during a holiday weekend?',
      empty: '',
      long: 'This is a very long message that simulates a user who provides extensive detail about their situation. '.repeat(50)
    };
    
    return messages[type] || messages.simple;
  },

  /**
   * Validate standard API response structure
   */
  validateApiResponse: (response) => {
    expect(response).toHaveProperty('persona');
    expect(response).toHaveProperty('response');
    expect(response).toHaveProperty('timestamp');
    expect(typeof response.persona).toBe('string');
    expect(typeof response.response).toBe('string');
    expect(response.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  },

  /**
   * Create a mock Ollama response
   */
  createMockOllamaResponse: (content = 'Mock AI response') => ({
    message: {
      content: content
    }
  }),

  /**
   * List of valid personas for testing
   */
  validPersonas: ['unemployment-benefits', 'parks-recreation', 'business-licensing', 'default'],

  /**
   * Common error scenarios for testing
   */
  errorScenarios: {
    missingMessage: { expectedStatus: 400, expectedError: 'Message is required' },
    serviceUnavailable: { expectedStatus: 500, expectedError: 'Internal server error' },
    timeout: { expectedStatus: 500, expectedError: 'Internal server error' }
  }
};

// Global test data
global.testData = {
  sampleMessages: {
    unemploymentBenefits: [
      'How do I apply for unemployment benefits?',
      'What documents do I need for my unemployment claim?',
      'When will I receive my first unemployment payment?'
    ],
    parksRecreation: [
      'Can I reserve a pavilion for a birthday party?',
      'What are the hours for the community center?',
      'Are dogs allowed in the city parks?'
    ],
    businessLicensing: [
      'How do I get a business license for a restaurant?',
      'What permits do I need to operate a food truck?',
      'How much does a liquor license cost?'
    ],
    general: [
      'What services does the city provide?',
      'How do I contact the mayor\'s office?',
      'Where can I pay my water bill?'
    ]
  }
};

// Console log suppression for cleaner test output
const originalConsole = console;
global.console = {
  ...originalConsole,
  // Suppress console.log in tests unless VERBOSE_TESTS is set
  log: process.env.VERBOSE_TESTS ? originalConsole.log : jest.fn(),
  // Keep error logging for debugging
  error: originalConsole.error,
  warn: originalConsole.warn,
  info: process.env.VERBOSE_TESTS ? originalConsole.info : jest.fn()
};

// Test database/mock cleanup
afterEach(() => {
  // Clean up any test artifacts if needed
  jest.clearAllMocks();
});

// Global cleanup after all tests
afterAll(() => {
  // Force cleanup of any remaining timers or intervals
  jest.clearAllTimers();
  jest.useRealTimers();
  
  // Restore console
  global.console = originalConsole;
});

// Global error handling for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in tests, just log the error
});

// Handle uncaught exceptions in tests
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

module.exports = {};
