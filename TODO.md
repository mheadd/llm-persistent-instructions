# TODO: LLM Provider Abstraction Implementation

## 🔄 **High-Level Architecture Changes**

### **1. Abstract LLM Provider Interface**

Create a provider abstraction layer that standardizes how we interact with different LLMs:

```javascript
class BaseLLMProvider {
  constructor(config) {
    this.config = config;
  }

  async generateResponse(prompt, options = {}) {
    throw new Error('generateResponse must be implemented by provider');
  }

  async healthCheck() {
    throw new Error('healthCheck must be implemented by provider');
  }

  getProviderName() {
    throw new Error('getProviderName must be implemented by provider');
  }
}

module.exports = BaseLLMProvider;
```

### **2. Provider Implementations**

Create specific implementations for each LLM service:

```javascript
const BaseLLMProvider = require('./base-provider');
const axios = require('axios');

class OllamaProvider extends BaseLLMProvider {
  async generateResponse(prompt, options = {}) {
    const response = await axios.post(`${this.config.url}/api/generate`, {
      model: this.config.model || 'phi3:mini',
      prompt: prompt,
      stream: false,
      options: {
        temperature: options.temperature || 0.7,
        num_predict: options.maxTokens || 300,
        ...options
      }
    });
    
    return {
      text: response.data.response,
      provider: 'ollama',
      model: this.config.model
    };
  }

  async healthCheck() {
    const response = await axios.get(`${this.config.url}/api/tags`);
    return response.status === 200;
  }

  getProviderName() {
    return 'Ollama (Local)';
  }
}

module.exports = OllamaProvider;
```

```javascript
const BaseLLMProvider = require('./base-provider');
const OpenAI = require('openai');

class OpenAIProvider extends BaseLLMProvider {
  constructor(config) {
    super(config);
    this.client = new OpenAI({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY
    });
  }

  async generateResponse(prompt, options = {}) {
    const response = await this.client.chat.completions.create({
      model: this.config.model || 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 300,
      ...options
    });

    return {
      text: response.choices[0].message.content,
      provider: 'openai',
      model: this.config.model,
      usage: response.usage
    };
  }

  async healthCheck() {
    try {
      await this.client.models.list();
      return true;
    } catch (error) {
      return false;
    }
  }

  getProviderName() {
    return 'OpenAI API';
  }
}

module.exports = OpenAIProvider;
```

### **3. Provider Factory & Configuration**

```javascript
const OllamaProvider = require('./ollama-provider');
const OpenAIProvider = require('./openai-provider');
const AnthropicProvider = require('./anthropic-provider');

class ProviderFactory {
  static createProvider(config) {
    switch (config.type.toLowerCase()) {
      case 'ollama':
        return new OllamaProvider(config);
      case 'openai':
        return new OpenAIProvider(config);
      case 'anthropic':
        return new AnthropicProvider(config);
      default:
        throw new Error(`Unsupported provider type: ${config.type}`);
    }
  }

  static getSupportedProviders() {
    return ['ollama', 'openai', 'anthropic', 'azure', 'huggingface'];
  }
}

module.exports = ProviderFactory;
```

### **4. Environment Configuration**

Add LLM provider configuration to environment variables and config files:

```yaml
default_provider: "ollama"

providers:
  ollama:
    type: "ollama"
    url: "http://ollama:11434"
    model: "phi3:mini"
    timeout: 60000
    
  openai:
    type: "openai"
    model: "gpt-3.5-turbo"
    api_key_env: "OPENAI_API_KEY"
    timeout: 30000
    
  anthropic:
    type: "anthropic"
    model: "claude-3-haiku-20240307"
    api_key_env: "ANTHROPIC_API_KEY"
    timeout: 30000

  azure:
    type: "azure"
    endpoint: "https://your-resource.openai.azure.com/"
    api_key_env: "AZURE_OPENAI_API_KEY"
    deployment: "gpt-35-turbo"
    api_version: "2023-12-01-preview"
```

### **5. Updated Server Architecture**

```javascript
const ProviderFactory = require('./providers/provider-factory');
const yaml = require('js-yaml');
const fs = require('fs');

// Load LLM configuration
const llmConfig = yaml.load(fs.readFileSync('./config/llm-config.yaml', 'utf8'));
const currentProvider = process.env.LLM_PROVIDER || llmConfig.default_provider;
const providerConfig = llmConfig.providers[currentProvider];

// Initialize LLM provider
const llmProvider = ProviderFactory.createProvider(providerConfig);

// Updated generateResponse function
async function generateResponse(persona, userMessage) {
    try {
        const config = loadPersonaConfig(persona);
        const fullPrompt = `${config.system_prompt}\n\nUser: ${userMessage}\nAssistant:`;

        console.log(`🤖 Generating response for persona: ${persona} using ${llmProvider.getProviderName()}`);

        const response = await llmProvider.generateResponse(fullPrompt, {
            temperature: 0.7,
            maxTokens: 300
        });

        return {
            text: response.text,
            provider: response.provider,
            model: response.model,
            persona: persona
        };
    } catch (error) {
        console.error(`❌ Error generating response:`, error.message);
        throw new Error(`Failed to generate response: ${error.message}`);
    }
}

// New endpoint to check provider status
app.get('/api/provider/status', async (req, res) => {
    try {
        const isHealthy = await llmProvider.healthCheck();
        res.json({
            provider: llmProvider.getProviderName(),
            healthy: isHealthy,
            config: currentProvider
        });
    } catch (error) {
        res.status(500).json({
            provider: llmProvider.getProviderName(),
            healthy: false,
            error: error.message
        });
    }
});

// New endpoint to list available providers
app.get('/api/providers', (req, res) => {
    res.json({
        current: currentProvider,
        available: ProviderFactory.getSupportedProviders(),
        supported_models: llmConfig.providers
    });
});
```

## 🚀 **Demonstration Features**

### **1. Easy Provider Switching**

```bash
# Switch to OpenAI
export LLM_PROVIDER=openai
export OPENAI_API_KEY=your_key_here
docker-compose up -d

# Switch to Anthropic
export LLM_PROVIDER=anthropic
export ANTHROPIC_API_KEY=your_key_here
docker-compose up -d

# Back to local Ollama
export LLM_PROVIDER=ollama
docker-compose up -d
```

### **2. Docker Compose Flexibility**

```yaml
services:
  api:
    build: ./api
    environment:
      - LLM_PROVIDER=${LLM_PROVIDER:-ollama}
      - OPENAI_API_KEY=${OPENAI_API_KEY:-}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
    profiles:
      - api

  ollama:
    image: ollama/ollama:latest
    profiles:
      - ollama
      - local

# Usage:
# docker-compose --profile local up      # Ollama + API
# docker-compose --profile api up        # API only (cloud LLM)
```

### **3. Comparison Demo Script**

```bash
#!/bin/bash

echo "🔄 Testing Government AI with different LLM providers..."

QUESTION='{"message": "What permits do I need for a food truck?"}'

echo "📝 Question: What permits do I need for a food truck?"
echo ""

# Test Ollama (Local)
echo "🏠 Testing Ollama (Local Phi-3)..."
export LLM_PROVIDER=ollama
docker-compose --profile local up -d
sleep 10
curl -s -X POST http://localhost:3000/api/chat/business-licensing \
  -H "Content-Type: application/json" \
  -d "$QUESTION" | jq '.response' | head -5
echo ""

# Test OpenAI
echo "☁️ Testing OpenAI GPT-3.5..."
export LLM_PROVIDER=openai
docker-compose --profile api up -d
sleep 5
curl -s -X POST http://localhost:3000/api/chat/business-licensing \
  -H "Content-Type: application/json" \
  -d "$QUESTION" | jq '.response' | head -5
echo ""

# Test Anthropic
echo "🧠 Testing Anthropic Claude..."
export LLM_PROVIDER=anthropic
curl -s -X POST http://localhost:3000/api/chat/business-licensing \
  -H "Content-Type: application/json" \
  -d "$QUESTION" | jq '.response' | head -5
```

## 📊 **Benefits of This Approach**

### **1. Flexibility**
- ✅ Switch between local and cloud LLMs
- ✅ Test different models for quality/cost comparison
- ✅ Use local for development, cloud for production

### **2. Cost Optimization**
- ✅ Local Ollama for development (free)
- ✅ Cloud APIs for production (pay-per-use)
- ✅ Easy A/B testing between providers

### **3. Demonstrates Core Concept**
- ✅ **Same instruction layering** works across all LLMs
- ✅ **Persona consistency** regardless of backend
- ✅ **Provider abstraction** shows architectural flexibility

### **4. Production Ready**
- ✅ Fallback providers for reliability
- ✅ Health monitoring for each provider
- ✅ Easy configuration management

## 🎯 **Implementation Priority**

1. **Phase 1**: Create base provider interface and Ollama provider
2. **Phase 2**: Add OpenAI provider implementation
3. **Phase 3**: Add configuration management and factory pattern
4. **Phase 4**: Update server.js to use provider abstraction
5. **Phase 5**: Add provider status/monitoring endpoints
6. **Phase 6**: Create demo scripts and documentation
7. **Phase 7**: Add additional providers (Anthropic, Azure, etc.)

This architecture would clearly demonstrate that the **instruction layering technique** is provider-agnostic and works equally well with local models (Ollama/Phi-3) and cloud APIs (OpenAI, Anthropic, etc.), showcasing the true power and flexibility of the approach! 🚀
