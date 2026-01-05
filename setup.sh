#!/bin/bash

# ReliefFund - Complete Setup Script
# This script sets up the entire Phase-1 environment

echo "🚀 ReliefFund Phase-1 Setup"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

print_success "Node.js $(node --version) detected"
echo ""

# 1. Setup Contracts
print_step "Setting up Hardhat & Smart Contracts..."
cd contracts
if [ ! -d "node_modules" ]; then
    npm install
    print_success "Contracts dependencies installed"
else
    print_warning "Contracts dependencies already installed"
fi
cd ..
echo ""

# 2. Setup Backend
print_step "Setting up Backend API..."
cd backend
if [ ! -d "node_modules" ]; then
    npm install
    print_success "Backend dependencies installed"
else
    print_warning "Backend dependencies already installed"
fi

# Create .env from example if it doesn't exist
if [ ! -f ".env" ]; then
    cp .env.example .env
    print_success "Created .env file"
else
    print_warning ".env file already exists"
fi
cd ..
echo ""

# 3. Setup Frontend
print_step "Setting up Frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
    print_success "Frontend dependencies installed"
else
    print_warning "Frontend dependencies already installed"
fi

# Create .env.local from example if it doesn't exist
if [ ! -f ".env.local" ]; then
    cp .env.example .env.local
    print_success "Created .env.local file"
else
    print_warning ".env.local file already exists"
fi
cd ..
echo ""

echo "================================"
print_success "Phase-1 Setup Complete!"
echo ""
echo "📋 Next Steps:"
echo "   1. Start Hardhat node:    cd contracts && npm run node"
echo "   2. Deploy contracts:      cd contracts && npm run deploy"
echo "   3. Update .env files with CONTRACT_ADDRESS"
echo "   4. Start backend:         cd backend && npm run dev"
echo "   5. Start frontend:        cd frontend && npm run dev"
echo ""
echo "🌐 Access the app at: http://localhost:3000"
echo ""
