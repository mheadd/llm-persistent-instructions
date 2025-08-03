# Government AI Prototype - Persistent Instruction Layering Demo

## Project Overview
Build a containerized application demonstrating persistent instruction layering using open-source AI models. The system shows how the same LLM can provide different government service experiences based on endpoint-specific instructions.

## Architecture
- **3-container Docker Compose setup**
- **Ollama container**: Runs Phi-3 Mini (3.8B parameters) LLM
- **Node.js API container**: Express.js REST API with instruction layering logic
- **Communication**: API forwards requests to Ollama with prepended instructions

## Three Government Service Personas
1. **Unemployment Benefits Assistant**: Eligibility, applications, status checks
2. **Parks and Recreation Guide**: Park information, activities, reservations  
3. **Business Licensing Assistant**: Permits, regulations, compliance requirements

## API Endpoints
```
POST /api/chat/unemployment-benefits
POST /api/chat/parks-recreation
POST /api/chat/business-licensing
POST /api/chat/default
```

Each endpoint applies different instruction templates to the same base model.

## Request/Response Format
```json
// Request
{
  "message": "How do I apply for unemployment benefits?"
}

// Response
{
  "response": "AI response with persona-specific guidance",
  "persona": "unemployment-benefits"
}
```

## Data Flow
1. Client hits specific endpoint
2. API loads corresponding instruction template from config file
3. User message prepended with persona instructions
4. Combined prompt sent to Ollama (localhost:11434)
5. Response returned to client

## File Structure
```
/
├── docker-compose.yml
├── api/
│   ├── Dockerfile
│   ├── package.json
│   ├── server.js
│   └── config/
│       ├── unemployment-benefits.yaml
│       ├── parks-recreation.yaml
│       └── business-licensing.yaml
└── README.md
```

## Technical Requirements
- Node.js with Express.js
- Ollama service running Phi-3 Mini
- YAML config files for instruction templates
- Docker containers with proper networking
- Error handling for Ollama communication

## Config File Format (YAML)
```yaml
persona: "unemployment-benefits"
system_prompt: |
  You are a helpful assistant specializing in unemployment insurance benefits...
examples:
  - user: "Am I eligible for unemployment?"
    assistant: "To determine eligibility..."
```

## Docker Compose Services
- `ollama`: Official Ollama image, pulls Phi-3, exposes 11434
- `api`: Node.js app, depends on ollama, exposes 3000, mounts configs
- Internal network for service communication

Start with basic REST API structure, then add Ollama integration, then containerization. 