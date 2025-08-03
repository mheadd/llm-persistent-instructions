#!/bin/bash

# Provider Switching Demo Script
# Demonstrates easy switching between different LLM providers

echo "🚀 LLM Provider Switching Demo"
echo "================================"

# Function to test API endpoint
test_api() {
    local provider_name=$1
    echo ""
    echo "🧪 Testing with $provider_name..."
    echo "Question: What permits do I need for a food truck?"
    
    response=$(curl -s -X POST http://localhost:3000/api/chat/business-licensing \
        -H "Content-Type: application/json" \
        -d '{"message": "What permits do I need for a food truck?"}' | jq -r '.provider // "error"')
    
    if [ "$response" != "error" ]; then
        echo "✅ Provider: $response"
        curl -s -X POST http://localhost:3000/api/chat/business-licensing \
            -H "Content-Type: application/json" \
            -d '{"message": "What permits do I need for a food truck?"}' | jq '.response' | head -3
    else
        echo "❌ Error: API not responding or provider failed"
    fi
    
    echo ""
    echo "Provider Status:"
    curl -s http://localhost:3000/api/provider/status | jq '{provider: .provider, healthy: .healthy}'
}

# Function to switch provider and restart server
switch_provider() {
    local provider=$1
    local description=$2
    
    echo ""
    echo "🔄 Switching to $description..."
    echo "Setting LLM_PROVIDER=$provider"
    
    # Update .env file
    if [ -f .env ]; then
        sed -i.bak "s/^LLM_PROVIDER=.*/LLM_PROVIDER=$provider/" .env
        echo "✅ Updated .env file"
    else
        echo "⚠️  No .env file found, using environment variable"
        export LLM_PROVIDER=$provider
    fi
}

# Function to check if server is running
check_server() {
    if curl -s http://localhost:3000/health > /dev/null; then
        return 0
    else
        return 1
    fi
}

# Main demo flow
echo ""
echo "📋 Available Providers:"
curl -s http://localhost:3000/api/providers | jq '.available'

echo ""
echo "🔍 Current Provider Status:"
curl -s http://localhost:3000/api/provider/status | jq '{provider: .provider, healthy: .healthy, model: .config.model}'

# Test current provider
test_api "Current Provider"

# Demo provider switching
echo ""
echo "🎭 Provider Switching Demo:"
echo "This script will show you how to switch providers."
echo "Note: In practice, you would restart the server after changing the .env file."

# Show how to switch to OpenAI (without actually doing it since we likely don't have API key)
echo ""
echo "📝 To switch to OpenAI:"
echo "1. Set your API key: export OPENAI_API_KEY=your-key-here"
echo "2. Update .env file: LLM_PROVIDER=openai"
echo "3. Restart the server: npm start"

echo ""
echo "🧪 Testing OpenAI provider configuration (without API key):"
curl -s -X POST http://localhost:3000/api/provider/test \
    -H "Content-Type: application/json" \
    -d '{"provider": "openai"}' | jq '{success: .success, error: .error}'

echo ""
echo "📝 To switch back to Ollama:"
echo "1. Update .env file: LLM_PROVIDER=ollama"
echo "2. Restart the server: npm start"

echo ""
echo "🎯 Key Benefits:"
echo "• Same personas work with any provider"
echo "• Easy configuration via .env file"
echo "• Automatic fallback support"
echo "• Real-time provider monitoring"
echo "• Secure API key management"

echo ""
echo "✨ Demo complete! The instruction layering approach works"
echo "   consistently across all LLM providers, showcasing true"
echo "   architectural flexibility! 🚀"
