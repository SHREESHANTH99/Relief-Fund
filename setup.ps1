# ReliefFund - Complete Setup Script for Windows
# This script sets up the entire Phase-1 environment

Write-Host "🚀 ReliefFund Phase-1 Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "❌ Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

Write-Host "✓ Node.js $nodeVersion detected" -ForegroundColor Green
Write-Host ""

# 1. Setup Contracts
Write-Host "▶ Setting up Hardhat & Smart Contracts..." -ForegroundColor Blue
Set-Location contracts
if (-not (Test-Path "node_modules")) {
    npm install
    Write-Host "✓ Contracts dependencies installed" -ForegroundColor Green
} else {
    Write-Host "⚠ Contracts dependencies already installed" -ForegroundColor Yellow
}
Set-Location ..
Write-Host ""

# 2. Setup Backend
Write-Host "▶ Setting up Backend API..." -ForegroundColor Blue
Set-Location backend
if (-not (Test-Path "node_modules")) {
    npm install
    Write-Host "✓ Backend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "⚠ Backend dependencies already installed" -ForegroundColor Yellow
}

# Create .env from example if it doesn't exist
if (-not (Test-Path ".env")) {
    Copy-Item .env.example .env
    Write-Host "✓ Created .env file" -ForegroundColor Green
} else {
    Write-Host "⚠ .env file already exists" -ForegroundColor Yellow
}
Set-Location ..
Write-Host ""

# 3. Setup Frontend
Write-Host "▶ Setting up Frontend..." -ForegroundColor Blue
Set-Location frontend
if (-not (Test-Path "node_modules")) {
    npm install
    Write-Host "✓ Frontend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "⚠ Frontend dependencies already installed" -ForegroundColor Yellow
}

# Create .env.local from example if it doesn't exist
if (-not (Test-Path ".env.local")) {
    Copy-Item .env.example .env.local
    Write-Host "✓ Created .env.local file" -ForegroundColor Green
} else {
    Write-Host "⚠ .env.local file already exists" -ForegroundColor Yellow
}
Set-Location ..
Write-Host ""

Write-Host "================================" -ForegroundColor Cyan
Write-Host "✓ Phase-1 Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:"
Write-Host "   1. Start Hardhat node:    cd contracts; npm run node"
Write-Host "   2. Deploy contracts:      cd contracts; npm run deploy"
Write-Host "   3. Update .env files with CONTRACT_ADDRESS"
Write-Host "   4. Start backend:         cd backend; npm run dev"
Write-Host "   5. Start frontend:        cd frontend; npm run dev"
Write-Host ""
Write-Host "🌐 Access the app at: http://localhost:3000"
Write-Host ""
