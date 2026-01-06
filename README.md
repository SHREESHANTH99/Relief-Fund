# ReliefFund 🌍

A Policy-Driven, Transparent Disaster Relief Fund Platform with Blockchain Technology

[![Production Ready](https://img.shields.io/badge/status-production%20ready-brightgreen)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()
[![Deployment](https://img.shields.io/badge/deploy-Vercel%20%2B%20Render-black)]()

---

## 🚀 Quick Deploy to Production

**Get running in 30 minutes!** → Read [QUICK_DEPLOY.md](./QUICK_DEPLOY.md)

For detailed instructions → See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

---

## 📦 Project Structure

```
reliefFund/
├── contracts/     # Solidity smart contracts + Hardhat
├── backend/       # Express.js API + Blockchain Integration
└── frontend/      # Next.js web application
```

---

## ✨ Features

### Phase 1: Relief Token System ✅

- Role-based access control (Admin, Donor, Beneficiary, Merchant)
- Token allocation with expiry
- Category-restricted spending (Food, Medicine, Emergency)
- Per-user spending limits (daily/weekly)

### Phase 2: PIN Authentication & QR Payments ✅

- Gasless transactions (relayer system)
- PIN-based quick payments
- QR code payment system
- Transaction history tracking

### Phase 3: Offline Payments ✅

- IOU-based payments when internet is down
- Store-and-forward mechanism
- Bulk sync when online
- Admin monitoring dashboard

---

## 🏃 Quick Start (Local Development)

### 1. Start Blockchain

```bash
cd contracts
npm install
npx hardhat node
```

### 2. Deploy Smart Contract

```bash
cd contracts
npx hardhat run scripts/deploy.js --network localhost
# Note the contract address!
```

### 3. Configure Backend

```bash
cd backend
cp .env.example .env
# Update CONTRACT_ADDRESS in .env
npm install
npm start
```

### 4. Configure Frontend

```bash
cd frontend
cp .env.example .env.local
# Update NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local
npm install
npm run dev
```

Visit: http://localhost:3000

---

## 🌐 Production Deployment

### Frontend → Vercel

```bash
cd frontend
vercel
vercel --prod
```

### Backend → Render

Push to GitHub and connect via Render Dashboard

**Full Guide**: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

---

npm install
npm run dev

```

## Features

- **Role Management**: Admin, Donor, Beneficiary, Merchant
- **Event Logging**: Donations, Aid Allocation, Spending
- **Security**: Emergency pause mechanism
- **Transparency**: Blockchain-based auditability

## Environment

- Hardhat Local Node (31337)
- Test accounts pre-funded with ETH
- Deterministic deployment for demo resets
```
