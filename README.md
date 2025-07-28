# Government AI Prototype - Persistent Instruction Layering Demo

A containerized application demonstrating how to create different AI personas using instruction layering with open-source LLMs. This prototype shows how the same language model can provide specialized government service experiences through endpoint-specific instructions.

## 🎯 What This Demonstrates

This project showcases **persistent instruction layering** - a technique where different system prompts and contexts are dynamically applied to the same base AI model to create specialized assistants. Instead of training separate models, we use strategic prompt engineering to create distinct AI personas.

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
│   Client App    │    │   Node.js API    │    │  Ollama + Phi-3 │
│                 │────│   (Port 3000)    │────│   (Port 11434)  │
│   Web/Mobile    │    │  Instruction     │    │   LLM Service   │
│                 │    │   Layering       │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Data Flow
1. Client sends request to specific persona endpoint
2. API loads corresponding instruction template from YAML config
3. User message is prepended with persona-specific system prompt
4. Combined prompt sent to Ollama service
5. AI response returned with persona context maintained

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- 8GB+ RAM (recommended for Phi-3 model)
- Git
- **Patience**: Initial setup takes 5-10 minutes due to model download and loading

### ⏱️ Expected Timeline (Optimized)
- **Container startup**: 30-60 seconds
- **Model download**: 3-5 minutes (2.2GB download)
- **First API request**: 30-90 seconds (model loading into memory)
- **Subsequent requests**: 5-15 seconds (significantly improved with optimizations)

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd llm-persistent-instructions

# Start all services (now with optimized memory allocation)
docker-compose up -d

# Pull the Phi-3 model manually (required on first run)
docker exec ollama-service ollama pull phi3:mini

# Wait for the model to download (2.2GB - may take several minutes)
# Monitor the download progress in the output above

# Test the API (note: first request may take 30-90 seconds)
curl -X POST http://localhost:3000/api/chat/unemployment-benefits \
  -H "Content-Type: application/json" \
  -d '{"message": "How do I apply for unemployment benefits?"}'
```

### ⚠️ Important Setup Notes
- **First-time setup**: The Phi-3 model download is ~2.2GB and happens on first run
- **Memory requirement**: Ensure you have at least 10GB of available RAM (8GB for Ollama + 2GB for system)
- **Docker memory**: Make sure Docker Desktop has sufficient memory allocated (8GB+ recommended)
- **Initial response time**: First API requests take 30-90 seconds as the model loads into memory
- **Model persistence**: With optimizations, the model stays in memory for 60 minutes after last use
- **Subsequent requests**: Much faster (5-15 seconds) once the model is loaded and cached

## 📡 API Endpoints

| Endpoint | Purpose | Example Use Case |
|----------|---------|------------------|
| `POST /api/chat/unemployment-benefits` | Unemployment assistance | "Am I eligible for benefits?" |
| `POST /api/chat/parks-recreation` | Parks & recreation info | "What activities are available at Central Park?" |
| `POST /api/chat/business-licensing` | Business permit guidance | "What permits do I need for a food truck?" |
| `POST /api/chat/default` | General assistant | "Hello, how can you help me?" |

### Request Format
```json
{
  "message": "Your question here"
}
```

### Response Format
```json
{
  "response": "AI-generated response with persona-specific guidance",
  "persona": "unemployment-benefits",
  "timestamp": "2025-07-28T10:30:00Z"
}
```

## 🛠️ Technical Stack

- **AI Model**: Phi-3 Mini (3.8B parameters) via Ollama
- **API**: Node.js with Express.js
- **Configuration**: YAML files for instruction templates
- **Containerization**: Docker Compose
- **Networking**: Internal Docker network for service communication

## 📁 Project Structure

```
llm-persistent-instructions/
├── docker-compose.yml           # Multi-container orchestration
├── api/                        # Node.js API service
│   ├── Dockerfile             
│   ├── package.json           
│   ├── server.js              # Express.js server with routing
│   └── config/                # Persona instruction templates
│       ├── unemployment-benefits.yaml
│       ├── parks-recreation.yaml
│       └── business-licensing.yaml
├── README.md                   # This file
└── INSTRUCTIONS.md            # Original project specifications
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

Try these example requests to see instruction layering in action:

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

## 🔄 Development Workflow

1. **Modify Personas**: Edit YAML files in `api/config/`
2. **Test Changes**: Restart API container: `docker-compose restart api`
3. **Add New Personas**: Create new YAML config + add route in `server.js`
4. **Monitor Logs**: `docker-compose logs -f api ollama`

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

This pattern is valuable for:

- **Government Services**: Different department assistants
- **Customer Support**: Product-specific help agents  
- **Education**: Subject-matter tutoring bots
- **Healthcare**: Specialized medical information assistants
- **E-commerce**: Category-specific shopping advisors

## 🤝 Contributing

This is a learning prototype. Feel free to:
- Add new government service personas
- Improve instruction templates
- Enhance the API with conversation memory
- Add a web frontend for easier testing
- Experiment with different LLM models

**Note**: This is a prototype for demonstration purposes. For production government services, ensure proper security, accessibility, and compliance with relevant regulations.
