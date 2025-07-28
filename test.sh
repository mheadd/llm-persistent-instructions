#!/bin/bash

# Test runner script for Government AI Prototype
# This script handles testing in both local and Docker environments

set -e  # Exit on any error

echo "🧪 Government AI Prototype - Test Suite"
echo "========================================"

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        echo "❌ Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Function to check if containers are running
check_containers() {
    if ! docker-compose ps | grep -q "Up"; then
        echo "⚠️  Docker containers are not running."
        echo "   Starting containers for testing..."
        docker-compose up -d
        
        echo "   Waiting for services to be ready..."
        sleep 30
        
        # Wait for Ollama to be ready
        echo "   Checking Ollama service..."
        timeout 60 bash -c 'until curl -f http://localhost:11434/api/tags; do sleep 2; done' || {
            echo "❌ Ollama service failed to start within 60 seconds"
            exit 1
        }
        
        echo "✅ Services are ready"
    else
        echo "✅ Docker containers are running"
    fi
}

# Function to install test dependencies
install_deps() {
    echo "📦 Installing test dependencies..."
    cd api
    npm install
    cd ..
}

# Function to run unit tests
run_unit_tests() {
    echo "🔬 Running unit tests..."
    cd api
    npm test -- --testPathPattern="config.test.js"
    cd ..
}

# Function to run integration tests
run_integration_tests() {
    echo "🔗 Running integration tests..."
    cd api
    npm test -- --testPathPattern="api.test.js"
    cd ..
}

# Function to run performance tests
run_performance_tests() {
    echo "⚡ Running performance tests..."
    cd api
    npm test -- --testPathPattern="performance.test.js"
    cd ..
}

# Function to run end-to-end tests
run_e2e_tests() {
    echo "🎯 Running end-to-end tests..."
    cd api
    npm test -- --testPathPattern="e2e.test.js"
    cd ..
}

# Function to run all tests
run_all_tests() {
    echo "🚀 Running complete test suite..."
    cd api
    npm test
    cd ..
}

# Function to generate coverage report
generate_coverage() {
    echo "📊 Generating coverage report..."
    cd api
    npm run test:coverage
    echo "📊 Coverage report generated in api/coverage/"
    cd ..
}

# Function to clean up test artifacts
cleanup() {
    echo "🧹 Cleaning up test artifacts..."
    cd api
    rm -rf coverage/ || true
    rm -rf node_modules/.cache/ || true
    cd ..
}

# Parse command line arguments
case "${1:-all}" in
    "unit")
        check_docker
        install_deps
        run_unit_tests
        ;;
    "integration")
        check_docker
        check_containers
        install_deps
        run_integration_tests
        ;;
    "performance")
        check_docker
        check_containers
        install_deps
        run_performance_tests
        ;;
    "e2e")
        check_docker
        check_containers
        install_deps
        run_e2e_tests
        ;;
    "coverage")
        check_docker
        check_containers
        install_deps
        generate_coverage
        ;;
    "all")
        check_docker
        check_containers
        install_deps
        run_all_tests
        ;;
    "clean")
        cleanup
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  unit         Run unit tests only"
        echo "  integration  Run integration tests only"
        echo "  performance  Run performance tests only"
        echo "  e2e          Run end-to-end tests only"
        echo "  coverage     Run all tests with coverage report"
        echo "  all          Run complete test suite (default)"
        echo "  clean        Clean up test artifacts"
        echo "  help         Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 unit      # Run only unit tests"
        echo "  $0 coverage  # Run all tests with coverage"
        echo "  $0 clean     # Clean up test files"
        ;;
    *)
        echo "❌ Unknown command: $1"
        echo "Run '$0 help' for usage information"
        exit 1
        ;;
esac

echo ""
echo "✅ Test execution completed!"
echo "========================================"
