# Government AI Prototype - Persistent Instruction Layering Demo

[![CI - Tests & Security](https://github.com/mheadd/llm-persistent-instructions/actions/workflows/ci.yml/badge.svg)](https://github.com/mheadd/llm-persistent-instructions/actions/workflows/ci.yml)

A containerized application demonstrating how to create different AI personas using instruction layering with **multiple LLM providers**. This prototype shows how the same instruction layering approach works seamlessly across local models (Ollama) and cloud APIs (OpenAI, Anthropic, etc.).

## 🎯 What This Demonstrates

This project showcases **persistent instruction layering** - a technique where different system prompts and contexts are dynamically applied to any compatible AI model to create specialized assistants. Instead of training separate models, we use strategic prompt engineering to create distinct AI personas that work consistently across **multiple LLM backends**.

### 🔄 **Multi-Provider Architecture**

The application now supports:
- **🏠 Local Models**: Ollama with Phi-3, Llama, etc. (free, private)
- **☁️ Cloud APIs**: OpenAI GPT-3.5/GPT-4, Anthropic Claude (paid, powerful)
- **🔀 Easy Switching**: Change providers via environment variables
- **📊 Monitoring**: Real-time provider status and health checks

## 🏛️ Government Service Personas

The demo includes three government service assistants:

1. **🏢 Unemployment Benefits Assistant**
   - Eligibility requirements and application guidance
   - Benefit calculations and status checks
   - Appeals process information

2. **🌳 Parks and Recreation Guide**
   - Park information and facility details
   - Activity recommendations and schedules
   - Reservation systems and accessibility info

3. **📋 Business Licensing Assistant**
   - Permit requirements and application processes
   - Regulatory compliance guidance
   - Fee structures and renewal procedures

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client App    │    │   Node.js API    │    │  LLM Providers  │
│                 │────│   (Port 3000)    │────│                 │
│   Web/Mobile    │    │  Provider        │    │ • Ollama+Phi-3  │
│                 │    │  Abstraction     │    │ • OpenAI GPT    │
└─────────────────┘    └──────────────────┘    │ • Anthropic     │
                                                │ • Azure OpenAI  │
                                                └─────────────────┘
```

### 🔄 **Provider Abstraction Layer**
The application features a flexible provider abstraction that allows seamless switching between:
- **Local Models**: Ollama with various models (Phi-3, Llama2, CodeLlama, etc.)
- **OpenAI**: GPT-3.5-turbo, GPT-4, GPT-4-turbo
- **Future Support**: Anthropic Claude, Azure OpenAI, Google PaLM, and others

### Data Flow
1. Client sends request to specific persona endpoint
2. API loads corresponding instruction template from YAML config
3. **Provider abstraction** applies user message with persona-specific system prompt
4. **Configurable LLM backend** generates response using instruction layering
5. AI response returned with provider metadata and persona context maintained

## 🔧 Provider Configuration

The application supports multiple LLM providers through a flexible configuration system using environment variables and `.env` files.

### 🎛️ **Supported Providers**

| Provider | Type | Models | Cost | Setup Complexity |
|----------|------|---------|------|------------------|
| **Ollama** | Local | Phi-3, Llama2, CodeLlama, etc. | Free | Medium (Docker required) |
| **OpenAI** | Cloud API | GPT-3.5-turbo, GPT-4, GPT-4-turbo | Paid | Easy (API key only) |
| **Anthropic** | Cloud API | Claude-3-haiku, Claude-3-sonnet | Paid | Easy (API key only) |
| **Azure OpenAI** | Cloud API | GPT models via Azure | Paid | Medium (Azure setup) |

### 📄 **Configuration File Setup**

#### 1. **Copy Environment Template**
```bash
cd api
cp .env.example .env
```

#### 2. **Configure Your Preferred Provider**

**Option A: Local Ollama (Default)**
```bash
# Edit .env file
LLM_PROVIDER=ollama
OLLAMA_URL=http://ollama:11434
OLLAMA_MODEL=phi3:mini
```

**Option B: OpenAI Cloud API**
```bash
# Edit .env file  
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-actual-api-key-here
OPENAI_MODEL=gpt-3.5-turbo
```

**Option C: OpenAI GPT-4 (More Capable)**
```bash
# Edit .env file
LLM_PROVIDER=openai-gpt4
OPENAI_API_KEY=sk-your-actual-api-key-here
OPENAI_MODEL=gpt-4
```

### 🔄 **Easy Provider Switching**

#### **Method 1: Edit .env File**
```bash
# Switch to OpenAI
sed -i 's/LLM_PROVIDER=.*/LLM_PROVIDER=openai/' .env

# Switch back to Ollama
sed -i 's/LLM_PROVIDER=.*/LLM_PROVIDER=ollama/' .env

# Restart the application
docker-compose restart api
```

#### **Method 2: Environment Variables (No Restart Required)**
```bash
# Run with OpenAI
LLM_PROVIDER=openai OPENAI_API_KEY=your-key docker-compose up

# Run with Ollama  
LLM_PROVIDER=ollama docker-compose up
```

### 🔍 **Provider Status Monitoring**

Check current provider status and health:
```bash
# Current provider info
curl http://localhost:3000/api/provider/status

# List all available providers
curl http://localhost:3000/api/providers

# Test a specific provider
curl -X POST http://localhost:3000/api/provider/test \
  -H "Content-Type: application/json" \
  -d '{"provider": "openai"}'
```

### 🚀 **Provider-Specific Setup Instructions**

#### **🏠 Ollama (Local) Setup**
```bash
# Default setup - no API keys required
LLM_PROVIDER=ollama
OLLAMA_URL=http://ollama:11434
OLLAMA_MODEL=phi3:mini

# Alternative models
OLLAMA_MODEL=llama2           # Meta's Llama 2
OLLAMA_MODEL=codellama        # Code-focused model  
OLLAMA_MODEL=mistral          # Mistral 7B model
```

#### **☁️ OpenAI Setup**
1. Get API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Configure environment:
```bash
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-actual-api-key-here
OPENAI_MODEL=gpt-3.5-turbo    # Fast, cost-effective
# OPENAI_MODEL=gpt-4          # More capable, slower, expensive
```

#### **🧠 Anthropic Claude Setup** (Future Support)
```bash
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=your-anthropic-key
ANTHROPIC_MODEL=claude-3-haiku-20240307
```

### ⚡ **Performance & Cost Comparison**

| Provider | Speed | Quality | Cost (1K tokens) | Setup Time |
|----------|-------|---------|------------------|------------|
| Ollama (Phi-3) | Fast | Good | Free | 5-10 min |
| OpenAI GPT-3.5 | Very Fast | Excellent | $0.002 | 30 seconds |
| OpenAI GPT-4 | Moderate | Outstanding | $0.03 | 30 seconds |

### 🎯 **Use Case Recommendations**

- **🏠 Development/Testing**: Use Ollama (free, private)
- **💼 Production (Budget)**: Use OpenAI GPT-3.5-turbo  
- **🚀 Production (Quality)**: Use OpenAI GPT-4
- **🔒 High Security**: Use local Ollama (no data leaves your infrastructure)

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- 8GB+ RAM (for Ollama) OR Cloud API key (for OpenAI/Anthropic)
- Git

### ⚡ **Quick Setup (Cloud API - Recommended for First-Time Users)**

```bash
# Clone the repository
git clone <repository-url>
cd llm-persistent-instructions/api

# Setup OpenAI (fastest way to get started)
cp .env.example .env

# Edit .env file and add your OpenAI API key:
# LLM_PROVIDER=openai
# OPENAI_API_KEY=sk-your-actual-api-key-here

# Start the API only (no local model download required)
docker-compose up api

# Test immediately (no waiting for model downloads)
curl -X POST http://localhost:3000/api/chat/unemployment-benefits \
  -H "Content-Type: application/json" \
  -d '{"message": "How do I apply for unemployment benefits?"}'
```

### 🏠 **Local Setup (Ollama - Free but Slower Initial Setup)**

```bash
# Clone the repository
git clone <repository-url>
cd llm-persistent-instructions

# Use default Ollama configuration
# (No API keys required)

# Start all services
docker-compose up -d

# Pull the Phi-3 model (required on first run)
docker exec ollama-service ollama pull phi3:mini

# Wait for model download (2.2GB - may take several minutes)
# Test the API (first request may take 30-90 seconds)
curl -X POST http://localhost:3000/api/chat/unemployment-benefits \
  -H "Content-Type: application/json" \
  -d '{"message": "How do I apply for unemployment benefits?"}'
```

### ⏱️ **Setup Time Comparison**

| Method | Initial Setup | First Response | Ongoing Cost |
|--------|---------------|----------------|--------------|
| **OpenAI** | 30 seconds | 2-5 seconds | ~$0.002/request |
| **Ollama** | 5-10 minutes | 30-90 seconds | Free |

### 🔄 **Switching Between Providers**

After initial setup, you can easily switch providers:

```bash
# Switch to OpenAI (if you have an API key)
echo "LLM_PROVIDER=openai" > api/.env
echo "OPENAI_API_KEY=your-key-here" >> api/.env
docker-compose restart api

# Switch back to Ollama
echo "LLM_PROVIDER=ollama" > api/.env  
docker-compose restart api

# Check current provider
curl http://localhost:3000/api/provider/status
```

## 📡 API Endpoints

### 🎭 **Persona Endpoints** (Work with any provider)
| Endpoint | Purpose | Example Use Case |
|----------|---------|------------------|
| `POST /api/chat/unemployment-benefits` | Unemployment assistance | "Am I eligible for benefits?" |
| `POST /api/chat/parks-recreation` | Parks & recreation info | "What activities are available at Central Park?" |
| `POST /api/chat/business-licensing` | Business permit guidance | "What permits do I need for a food truck?" |
| `POST /api/chat/default` | General assistant | "Hello, how can you help me?" |

### 🔧 **Provider Management Endpoints** (New!)
| Endpoint | Purpose | Example Use Case |
|----------|---------|------------------|
| `GET /api/provider/status` | Current provider health | Check if current provider is working |
| `GET /api/providers` | List all available providers | See configuration options |
| `POST /api/provider/test` | Test a specific provider | Validate API keys before switching |

### Request Format
```json
{
  "message": "Your question here"
}
```

### Response Format (Enhanced with Provider Info)
```json
{
  "response": "AI-generated response with persona-specific guidance",
  "persona": "unemployment-benefits",
  "provider": "openai",
  "model": "gpt-3.5-turbo", 
  "usage": {
    "prompt_tokens": 45,
    "completion_tokens": 120,
    "total_tokens": 165
  },
  "timestamp": "2025-08-03T15:30:00Z"
}
```

### Provider Status Response
```json
{
  "provider": "OpenAI (gpt-3.5-turbo)",
  "healthy": true,
  "config": {
    "type": "openai",
    "model": "gpt-3.5-turbo",
    "hasApiKey": true
  },
  "timestamp": "2025-08-03T15:30:00Z"
}
```

## 🛠️ Technical Stack

### 🧠 **AI Models (Configurable)**
- **Local**: Phi-3 Mini (3.8B), Llama2, CodeLlama, Mistral via Ollama
- **Cloud**: OpenAI GPT-3.5-turbo, GPT-4, GPT-4-turbo
- **Future**: Anthropic Claude, Azure OpenAI, Google PaLM

### 🏗️ **Backend Architecture**
- **API**: Node.js with Express.js
- **Provider Abstraction**: Factory pattern with base provider interface
- **Configuration**: YAML files for personas + .env for provider settings
- **Environment Management**: dotenv with validation and fallbacks
- **Containerization**: Docker Compose with service profiles

### 📊 **Monitoring & Management**
- **Health Checks**: Real-time provider status monitoring
- **Usage Tracking**: Token/request counting and performance metrics
- **Configuration Validation**: Startup environment validation
- **Error Handling**: Provider-specific error handling and fallbacks

## 📁 Project Structure

```
llm-persistent-instructions/
├── docker-compose.yml           # Multi-container orchestration
├── api/                        # Node.js API service
│   ├── Dockerfile             
│   ├── package.json           
│   ├── server.js              # Express.js server with provider abstraction
│   ├── .env.example           # Environment configuration template
│   ├── .env                   # Your actual configuration (git-ignored)
│   ├── demo-provider-switching.sh  # Interactive provider demo
│   ├── providers/             # LLM provider abstraction layer
│   │   ├── base-provider.js   # Base provider interface
│   │   ├── ollama-provider.js # Ollama implementation
│   │   ├── openai-provider.js # OpenAI implementation
│   │   └── provider-factory.js # Provider factory pattern
│   └── config/                # Configuration management
│       ├── llm-config.yaml    # Provider configurations
│       ├── llm-config-manager.js # Configuration loader
│       ├── environment-config.js # Environment validation
│       ├── unemployment-benefits.yaml # Persona configs
│       ├── parks-recreation.yaml
│       └── business-licensing.yaml
├── README.md                   # This file
├── TODO.md                    # Implementation roadmap
├── IMPLEMENTATION-COMPLETE.md # Implementation summary
└── ENV-CONFIGURATION.md       # Environment setup guide
```

## 🔧 Configuration

Each persona is defined by a YAML configuration file in `api/config/`:

```yaml
persona: "unemployment-benefits"
system_prompt: |
  You are a helpful assistant specializing in unemployment insurance benefits.
  Provide accurate, empathetic guidance on eligibility, applications, and processes.
  Always suggest contacting local unemployment offices for official determinations.
examples:
  - user: "Am I eligible for unemployment?"
    assistant: "To determine eligibility, I'll need to understand your situation..."
```

## 🔍 How Instruction Layering Works

1. **Base Model**: Phi-3 Mini provides general language understanding
2. **System Prompts**: Each endpoint loads persona-specific instructions
3. **Context Injection**: User messages are prefixed with system prompts
4. **Response Generation**: Model responds within the established persona context
5. **Consistency**: Conversation maintains persona throughout the session

## 🧪 Testing Different Personas

The instruction layering works identically across all providers. Try these examples:

### 🎭 **Persona Testing (Any Provider)**
```bash
# Unemployment Benefits
curl -X POST http://localhost:3000/api/chat/unemployment-benefits \
  -H "Content-Type: application/json" \
  -d '{"message": "I was laid off last week. What should I do?"}'

# Parks & Recreation  
curl -X POST http://localhost:3000/api/chat/parks-recreation \
  -H "Content-Type: application/json" \
  -d '{"message": "I want to plan a family picnic. Any suggestions?"}'

# Business Licensing
curl -X POST http://localhost:3000/api/chat/business-licensing \
  -H "Content-Type: application/json" \
  -d '{"message": "I want to start a consulting business. What permits do I need?"}'
```

### 🔍 **Provider Comparison Testing**
```bash
# Test with Ollama (local, free)
echo "LLM_PROVIDER=ollama" > api/.env
docker-compose restart api
curl -X POST http://localhost:3000/api/chat/business-licensing \
  -H "Content-Type: application/json" \
  -d '{"message": "What permits do I need for a food truck?"}' | jq '.provider'

# Test with OpenAI (cloud, paid) 
echo "LLM_PROVIDER=openai" > api/.env
echo "OPENAI_API_KEY=your-key" >> api/.env
docker-compose restart api
curl -X POST http://localhost:3000/api/chat/business-licensing \
  -H "Content-Type: application/json" \
  -d '{"message": "What permits do I need for a food truck?"}' | jq '.provider'
```

### 📊 **Provider Status Monitoring**
```bash
# Check current provider
curl http://localhost:3000/api/provider/status | jq

# List all available providers  
curl http://localhost:3000/api/providers | jq

# Test specific provider connectivity
curl -X POST http://localhost:3000/api/provider/test \
  -H "Content-Type: application/json" \
  -d '{"provider": "openai"}' | jq
```

### 🎯 **Demonstration Script**
Run the included demo to see provider switching in action:
```bash
cd api
./demo-provider-switching.sh
```

## ✅ Automated Testing

This project includes a comprehensive test suite to ensure reliability and catch regressions during development.

### Test Categories

- **🔬 Unit Tests**: Configuration loading, data validation
- **🔗 Integration Tests**: API endpoints, request/response handling
- **⚡ Performance Tests**: Response times, concurrent request handling
- **🎯 End-to-End Tests**: Complete user workflows, cross-persona consistency

### Running Tests

#### Quick Test (Recommended)
```bash
# Run the complete test suite
./test.sh
```

#### Specific Test Categories
```bash
# Unit tests only (fast, no Docker required)
./test.sh unit

# Integration tests (requires Docker containers)
./test.sh integration

# Performance tests
./test.sh performance

# End-to-end tests
./test.sh e2e

# Generate coverage report
./test.sh coverage
```

#### Manual Testing (Advanced)
```bash
# Install test dependencies
cd api
npm install

# Run specific test files
npm test -- config.test.js
npm test -- api.test.js
npm test -- performance.test.js
npm test -- e2e.test.js

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage
```

### Test Environment Setup

The test suite automatically:
1. ✅ Checks Docker availability
2. ✅ Starts containers if needed
3. ✅ Waits for services to be ready
4. ✅ Installs dependencies
5. ✅ Runs tests with mocked AI responses
6. ✅ Generates reports

### Test Features

- **Mocked AI Responses**: Tests run quickly without hitting the actual LLM
- **Realistic Scenarios**: Tests cover common government service inquiries
- **Error Handling**: Validates graceful handling of service failures
- **Performance Monitoring**: Ensures response times meet expectations
- **Cross-Browser Support**: API tests work with any HTTP client

### Continuous Integration

For CI/CD pipelines, use:
```bash
# Non-interactive test run with coverage
./test.sh coverage

# Results are saved to api/coverage/ for CI reporting
```

### Test Results

After running tests, you'll see:
- ✅ **Pass/Fail Status**: Clear indication of test results
- 📊 **Coverage Report**: Code coverage metrics
- ⏱️ **Performance Metrics**: Response time measurements
- 🐛 **Error Details**: Specific failure information when tests fail

Example output:
```
🧪 Government AI Prototype - Test Suite
========================================
✅ Docker containers are running
📦 Installing test dependencies...
🔬 Running unit tests...
   ✓ Configuration loading (4 tests)
🔗 Running integration tests...
   ✓ API endpoints (12 tests)
⚡ Running performance tests...
   ✓ Response times (6 tests)
🎯 Running end-to-end tests...
   ✓ User workflows (8 tests)
📊 Coverage: 95% statements, 92% branches
✅ Test execution completed!
```

## 🔄 Development Workflow

1. **Modify Personas**: Edit YAML files in `api/config/`
2. **Test Changes**: Run tests with `./test.sh unit` or `./test.sh integration`
3. **Add New Personas**: Create new YAML config + add route in `server.js`
4. **Monitor Logs**: `docker-compose logs -f api ollama`
5. **Commit Changes**: Push to main branch triggers automated CI/CD

## 🚀 Continuous Integration

This project includes automated GitHub Actions workflows that run on every commit to the main branch:

### CI/CD Pipeline
- **🔬 Unit Tests**: Configuration loading and validation tests
- **🔗 Integration Tests**: API endpoint and request handling tests  
- **🛡️ Security Scanning**: npm audit for dependency vulnerabilities
- **📊 Coverage Reports**: Automated test coverage generation
- **📤 Artifacts**: Test results and coverage reports saved for 7 days

### Workflow Triggers
- **Push to main**: Full test suite + security scan
- **Pull Requests**: Tests + dependency review
- **Manual**: Can be triggered manually from GitHub Actions tab

### Viewing Results
1. Go to the **Actions** tab in your GitHub repository
2. Click on the latest workflow run
3. View test results, coverage reports, and security scan results
4. Download artifacts for detailed analysis

### Local vs CI Testing
```bash
# Local development testing
./test.sh unit integration    # Quick feedback during development

# CI pipeline runs automatically
git push origin main          # Triggers full CI pipeline
```

## 🚨 Troubleshooting

### Common Issues and Solutions

#### 1. **Docker Build Fails - NPM Dependencies**
**Problem**: `npm ci --only=production` fails during Docker build
```
=> ERROR [api 4/8] RUN npm ci --only=production
```

**Solution**: Ensure `package-lock.json` exists by running locally:
```bash
cd api
npm install  # This creates package-lock.json
cd ..
docker-compose build api
```

#### 2. **Ollama Container Fails to Start**
**Problem**: `dependency failed to start: container ollama-service exited (1)`

**Solution**: Check if Docker has enough resources and restart:
```bash
# Check container logs
docker-compose logs ollama

# Clean restart
docker-compose down
docker-compose up -d
```

#### 3. **API Timeout Errors**
**Problem**: `timeout of 30000ms exceeded` or similar timeout errors

**Symptoms**:
- First requests take very long
- Timeout errors on initial model loading

**Solution**: This is expected behavior on first runs:
```bash
# Check if containers are running
docker-compose ps

# Wait for model to fully load (can take 2-3 minutes)
# Monitor Ollama logs
docker-compose logs -f ollama

# The first request to each persona may timeout - this is normal
# Subsequent requests will be much faster
```

#### 4. **API Returns Health Check Failures**
**Problem**: API container shows as `unhealthy` in `docker-compose ps`

**Solution**: The health check may fail initially while services start:
```bash
# Check API logs
docker-compose logs api

# Test health endpoint manually
curl http://localhost:3000/health

# If still failing, rebuild the API:
docker-compose build api
docker-compose up -d api
```

#### 5. **Model Not Found Errors**
**Problem**: `model 'phi3:mini' not found` in API responses

**Solution**: Manually pull the model:
```bash
# Pull the model explicitly
docker exec ollama-service ollama pull phi3:mini

# Verify it's available
docker exec ollama-service ollama list
```

#### 6. **Port Already in Use**
**Problem**: `port is already allocated` errors

**Solution**: Stop conflicting services or change ports:
```bash
# Find what's using the ports
lsof -i :3000
lsof -i :11434

# Stop conflicting services or modify docker-compose.yml ports
# For example, change "3000:3000" to "3001:3000"
```

#### 7. **Out of Memory Issues**
**Problem**: Containers crash or become unresponsive

**Symptoms**:
- Docker containers randomly stopping
- Very slow response times
- System becomes unresponsive

**Solution**: Ensure adequate system resources:
```bash
# Check Docker resource allocation
docker stats

# Minimum requirements:
# - 8GB RAM available
# - 4GB free disk space
# - Docker allocated sufficient memory (Docker Desktop settings)
```

### Performance Optimization Tips

1. **Keep containers running**: Avoid frequent restarts to prevent model reloading
2. **Monitor resource usage**: Use `docker stats` to monitor container resource consumption
3. **Sequential testing**: Test one persona at a time initially to avoid overloading
4. **Patience on first run**: Initial setup and first requests require patience

### Getting Help

If you encounter issues not covered here:

1. **Check container logs**: `docker-compose logs [service-name]`
2. **Verify container status**: `docker-compose ps`
3. **Test individual components**: 
   - API health: `curl http://localhost:3000/health`
   - Ollama service: `curl http://localhost:11434/api/tags`
4. **Clean restart**: `docker-compose down && docker-compose up -d`

## 💡 Use Cases & Applications

### 🎯 **Instruction Layering Pattern**
This approach is valuable for creating specialized AI assistants in:
- **Government Services**: Different department assistants
- **Customer Support**: Product-specific help agents  
- **Education**: Subject-matter tutoring bots
- **Healthcare**: Specialized medical information assistants
- **E-commerce**: Category-specific shopping advisors

### 🔄 **Multi-Provider Benefits**
The provider abstraction enables:
- **💰 Cost Optimization**: Free local models for development, paid APIs for production
- **🔒 Security Options**: Local models for sensitive data, cloud APIs for general use
- **⚡ Performance Tuning**: Fast cloud APIs for production, local models for testing
- **🌍 Global Deployment**: Choose providers based on regional availability
- **🎛️ A/B Testing**: Compare model performance across different providers

### 🚀 **Deployment Scenarios**

#### **Development Environment**
```bash
LLM_PROVIDER=ollama          # Free, local development
```

#### **Production (Budget-Conscious)**
```bash
LLM_PROVIDER=openai          # Cost-effective cloud API
OPENAI_MODEL=gpt-3.5-turbo
```

#### **Production (Quality-First)**
```bash
LLM_PROVIDER=openai          # High-quality responses
OPENAI_MODEL=gpt-4
```

#### **High-Security Environment**
```bash
LLM_PROVIDER=ollama          # No data leaves your infrastructure
OLLAMA_MODEL=phi3:mini
```

### ✨ **Key Architectural Achievement**

The same persona configurations and instruction layering approach work **identically** across all providers, demonstrating true architectural flexibility and provider independence! 🎉

## 🤝 Contributing

This is a learning prototype. Feel free to:
- Add new government service personas
- Improve instruction templates
- Enhance the API with conversation memory
- Add a web frontend for easier testing
- Experiment with different LLM models

**Note**: This is a prototype for demonstration purposes. For production government services, ensure proper security, accessibility, and compliance with relevant regulations.
