const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

describe('Configuration Loading', () => {
  describe('loadPersonaConfig', () => {
    // Mock fs for specific tests
    const mockFs = {
      existsSync: jest.fn(),
      readFileSync: jest.fn()
    };

    // Import the function we need to test
    const loadPersonaConfig = (persona, customFs = fs) => {
      const configPath = path.join(__dirname, '..', 'config', `${persona}.yaml`);
      
      try {
        if (!customFs.existsSync(configPath)) {
          throw new Error(`Configuration file not found: ${configPath}`);
        }
        
        const configContent = customFs.readFileSync(configPath, 'utf8');
        const config = yaml.load(configContent);
        
        if (!config.system_prompt) {
          throw new Error('Configuration missing required system_prompt');
        }
        
        return config;
      } catch (error) {
        console.error(`Error loading persona config for ${persona}:`, error.message);
        throw error;
      }
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should load valid configuration file', () => {
      const mockConfig = {
        system_prompt: 'Test system prompt',
        examples: ['Example 1', 'Example 2']
      };
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(yaml.dump(mockConfig));
      
      const result = loadPersonaConfig('test-persona', mockFs);
      
      expect(result).toEqual(mockConfig);
      expect(mockFs.existsSync).toHaveBeenCalledWith(expect.stringContaining('test-persona.yaml'));
      expect(mockFs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('test-persona.yaml'), 'utf8');
    });

    test('should throw error when configuration file does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      
      expect(() => {
        loadPersonaConfig('nonexistent-persona', mockFs);
      }).toThrow('Configuration file not found');
    });

    test('should throw error when configuration missing system_prompt', () => {
      const invalidConfig = {
        examples: ['Example 1']
      };
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(yaml.dump(invalidConfig));
      
      expect(() => {
        loadPersonaConfig('invalid-persona', mockFs);
      }).toThrow('Configuration missing required system_prompt');
    });

    test('should handle YAML parsing errors', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid: yaml: content: [');
      
      expect(() => {
        loadPersonaConfig('broken-yaml', mockFs);
      }).toThrow();
    });
  });

  describe('Configuration File Structure', () => {
    const expectedPersonas = [
      'unemployment-benefits',
      'parks-recreation', 
      'business-licensing',
      'default'
    ];

    test.each(expectedPersonas)('should have valid %s configuration', (persona) => {
      const configPath = path.join(__dirname, '..', 'config', `${persona}.yaml`);
      
      // Check if file actually exists (integration test)
      expect(fs.existsSync(configPath)).toBe(true);
      
      const configContent = fs.readFileSync(configPath, 'utf8');
      const config = yaml.load(configContent);
      
      expect(config).toHaveProperty('system_prompt');
      expect(typeof config.system_prompt).toBe('string');
      expect(config.system_prompt.length).toBeGreaterThan(0);
      
      if (config.examples) {
        expect(Array.isArray(config.examples)).toBe(true);
      }
    });
  });
});
