# ReliefFund 🌍

> A Policy-Driven, Transparent Disaster Relief Fund Platform powered by Blockchain Technology

[![Production Ready](https://img.shields.io/badge/status-production%20ready-brightgreen)](https://github.com)
[![Solidity](https://img.shields.io/badge/solidity-0.8.20-blue)](https://docs.soliditylang.org)
[![Next.js](https://img.shields.io/badge/Next.js-14.0-black)](https://nextjs.org)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Deployment](https://img.shields.io/badge/deploy-Vercel%20%2B%20Render-black)](./DEPLOYMENT_GUIDE.md)

ReliefFund is a comprehensive blockchain-based disaster relief platform designed to provide transparent, efficient, and secure distribution of aid to beneficiaries during crisis situations. Built on Polygon with offline-first capabilities for disaster scenarios.

---

## 🎯 Problem Statement

Traditional disaster relief systems face challenges:

- ❌ Lack of transparency in fund distribution
- ❌ Fraud and misuse of relief tokens
- ❌ No accountability for merchants
- ❌ Inability to function during network outages
- ❌ High transaction fees
- ❌ Complex onboarding for victims

ReliefFund solves these with:

- ✅ Blockchain transparency and immutability
- ✅ Role-based access control
- ✅ Offline payment capabilities
- ✅ Gasless transactions for beneficiaries
- ✅ Low-cost operations on Polygon
- ✅ Simple PIN-based authentication

---

## 📦 Project Architecture

```
reliefFund/
├── contracts/          # Smart Contracts (Solidity)
│   ├── contracts/
│   │   └── ReliefFund.sol         # Main contract
│   ├── scripts/
│   │   ├── deploy.js              # Local deployment
│   │   ├── deploy-polygon.js      # Polygon deployment
│   │   └── make-admin.js          # Admin setup
│   └── hardhat.config.js          # Network configs
│
├── backend/            # Express.js API Server
│   ├── routes/
│   │   ├── auth.js                # PIN & gasless tx
│   │   └── offline.js             # Offline payments
│   └── server.js                  # Main server
│
└── frontend/           # Next.js Web Application
    ├── components/
    │   ├── BeneficiaryDashboard.js    # Beneficiary UI
    │   ├── MerchantDashboard.js       # Merchant UI
    │   ├── AdminDashboard.js          # Admin UI
    │   ├── MerchantOfflineQueue.js    # Offline payments
    │   └── AdminOfflineMonitoring.js  # System monitor
    └── pages/
        └── index.js               # Main app
```

---

## ✨ Features Overview

### 🎭 Phase 1: Relief Token System

**Core Blockchain Functionality**

#### Role-Based Access Control

- **Admin**: System administration, role assignment, token allocation
- **Donor**: Can donate funds to the relief pool
- **Beneficiary**: Receives and spends relief tokens
- **Merchant**: Accepts payments from beneficiaries

#### Token Management

- ✅ **Non-transferable tokens** - Prevents black market trading
- ✅ **Expiry mechanism** - Tokens expire after set duration
- ✅ **Per-user allocation limits** - Maximum allocation per beneficiary
- ✅ **Spending limits** - Daily and weekly spending caps
- ✅ **Category restrictions** - Tokens only spendable at authorized merchants

#### Merchant Categories

- 🍔 **Food** - Restaurants, grocery stores
- 💊 **Medicine** - Pharmacies, medical supplies
- 🚨 **Emergency** - Essential services

#### Smart Contract Features

- Emergency pause mechanism
- Batch token expiry
- Complete audit trail via events
- Owner-based administration
- Upgradeable role system

---

### 🔐 Phase 2: PIN Authentication & Gasless Transactions

**Enhanced User Experience**

#### PIN-Based Authentication

- ✅ **4-digit PIN setup** for beneficiaries
- ✅ **Secure hashing** using Keccak256
- ✅ **Quick payments** without wallet signatures
- ✅ **PIN reset** functionality
- ✅ **Backend validation**

#### Gasless Transactions (Meta-Transactions)

- ✅ **Relayer system** - Backend pays gas fees
- ✅ **Zero-cost payments** for beneficiaries
- ✅ **Nonce-based replay protection**
- ✅ **Signature verification** on-chain
- ✅ **Trusted relayer** authorization

#### QR Code Payment System

- ✅ **Merchant QR generation** - Dynamic payment codes
- ✅ **QR scanner** - Built-in camera scanner
- ✅ **Payment confirmation** - Modal-based flow
- ✅ **Auto-populate** - Merchant details from QR
- ✅ **Transaction history** - Real-time updates

#### Transaction History

- Complete spending history
- Real-time balance updates
- Merchant information
- Timestamp tracking
- Transaction hash links

---

### 📡 Phase 3: Offline Payments & Store-and-Forward

**Disaster-Resilient Operations**

#### Offline IOU-Based Payments

- ✅ **Network-independent** - Works without internet
- ✅ **IOU generation** - Cryptographically signed promises
- ✅ **Local storage** - Backend queue system
- ✅ **Status tracking** - pending → synced → settled
- ✅ **Nonce verification** - Prevents double-spending

#### Store-and-Forward Mechanism

- ✅ **Bulk synchronization** - Upload all pending IOUs
- ✅ **Blockchain settlement** - Settle when network restored
- ✅ **Auto-retry** - Resilient sync mechanism
- ✅ **Conflict resolution** - Handles duplicate IOUs
- ✅ **Timestamp tracking** - Created, synced, settled times

#### Merchant Offline Queue

- Online/offline status indicator (real-time)
- Summary dashboard (Total, Pending, Settled)
- Create offline payments
- Bulk sync to blockchain
- Individual IOU details
- Auto-refresh (every 10s)

#### Admin Offline Monitoring

- System-wide IOU tracking
- Sync health indicator (Excellent/Good/Fair/Needs Sync)
- Filter by status (All/Pending/Settled)
- Merchant and beneficiary counting
- Total value tracking
- Real-time system health

#### NFC Card Support (Ready for Integration)

- Infrastructure for card-based payments
- Support for beneficiaries without smartphones
- Tap-to-pay functionality (planned)

#### Blind Signatures (Ready for Integration)

- Privacy-preserving IOU signatures
- Merchant cannot link beneficiary identity
- Admin verification without revealing beneficiary

---

## 🛠️ Technology Stack

### Blockchain

- **Solidity** 0.8.20 - Smart contract language
- **Hardhat** - Development environment
- **Ethers.js** v6 - Ethereum library
- **OpenZeppelin** - Secure contract standards
- **Polygon** - Production blockchain (low fees)

### Backend

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Axios** - HTTP client
- **dotenv** - Environment management
- **CORS** - Cross-origin support

### Frontend

- **Next.js** 14.0 - React framework
- **React** 18 - UI library
- **Ethers.js** - Blockchain interaction
- **qrcode.react** - QR code generation
- **Axios** - API communication
- **CSS Modules** - Scoped styling

### Development Tools

- **MetaMask** - Wallet integration
- **Vercel** - Frontend hosting
- **Render** - Backend hosting
- **Alchemy** - Blockchain RPC provider
- **PolygonScan** - Block explorer

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- MetaMask browser extension
- Git

### 1️⃣ Clone Repository

```bash
git clone https://github.com/yourusername/reliefFund.git
cd reliefFund
```

### 2️⃣ Start Local Blockchain

```bash
cd contracts
npm install
npx hardhat node
# Keep this terminal running!
```

### 3️⃣ Deploy Smart Contract

```bash
# In a new terminal
cd contracts
npx hardhat run scripts/deploy.js --network localhost
# Save the contract address!
```

### 4️⃣ Configure & Start Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env and add CONTRACT_ADDRESS from step 3
npm start
# Backend runs on http://localhost:5001
```

### 5️⃣ Configure & Start Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local and add CONTRACT_ADDRESS from step 3
npm run dev
# Frontend runs on http://localhost:3000
```

### 6️⃣ Access Application


**Test Accounts (Hardhat):**

- Admin: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- User wallets: Import any Hardhat account into MetaMask

---

## 🌐 Production Deployment

### Quick Deploy (30 minutes)


### Polygon Mainnet Deployment


**Configure Polygon:**

```bash
cd contracts
# Add your private key to .env
# Add MATIC to your wallet (10-20 MATIC)
node scripts/deploy-polygon.js
```

### Frontend → Vercel

```bash
cd frontend
npm install -g vercel
vercel login
vercel
vercel --prod
```

### Backend → Render

1. Push code to GitHub
2. Connect repository on Render
3. Add environment variables
4. Deploy!


---

## 📚 User Guides

### For Admins

**Role Management:**

```bash
cd contracts
node scripts/make-admin.js
```

**Allocate Tokens:**

1. Connect with admin wallet
2. Navigate to "💰 Allocate Tokens" tab
3. Enter beneficiary address, amount, expiry
4. Confirm transaction

**Register Merchants:**

1. Go to "🏪 Register Merchant" tab
2. Enter merchant address, category, business name
3. Submit transaction

**Monitor System:**

- View "📦 Offline Monitor" for IOU status
- Check sync health
- Monitor pending transactions

### For Beneficiaries

**Setup PIN:**

1. Connect wallet (beneficiary role)
2. Dashboard shows "Setup PIN" prompt
3. Enter 4-digit PIN
4. Confirm setup

**Make Payment (QR Code):**

1. Click "Scan QR" button
2. Allow camera access
3. Scan merchant QR code
4. Enter PIN for payment
5. Confirm transaction

**Make Payment (Manual):**

1. Go to "Manual Payment" tab
2. Enter merchant address
3. Enter amount
4. Add description
5. Confirm with PIN

**Make Offline Payment:**

1. When offline (red indicator)
2. Enter merchant address and amount
3. IOU created locally
4. Syncs when online

**View History:**

- "📊 History" tab shows all transactions
- See spent amount, merchant, timestamp
- Click transaction hash for details

### For Merchants

**Generate QR Code:**

1. Navigate to "QR Code" tab
2. QR code auto-generates
3. Display to customers for scanning

**View Transactions:**

- "Transaction History" shows all received payments
- Filter by date
- Export records (coming soon)

**Manage Offline Payments:**

1. Go to "📦 Offline Queue" tab
2. View pending IOUs
3. Click "Bulk Sync" when online
4. Transactions settle on blockchain

---

## 🔑 Environment Variables

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:5001
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourContractAddress
NEXT_PUBLIC_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_CHAIN_ID=137
```

### Backend (.env)

```env
PORT=5001
ALLOWED_ORIGINS=http://localhost:3000,https://your-app.vercel.app
RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
CONTRACT_ADDRESS=0xYourContractAddress
PRIVATE_KEY=your_backend_relayer_private_key
CHAIN_ID=137
```

### Contracts (.env)

```env
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
ETHERSCAN_API_KEY=your_polygonscan_api_key
DEPLOYER_PRIVATE_KEY=your_deployer_wallet_private_key
```

---

## 🧪 Testing

### Smart Contract Tests

```bash
cd contracts
npx hardhat test
```

### Backend API Tests

```bash
cd backend
npm test
```

### Manual Testing Checklist

- [ ] Admin can assign roles
- [ ] Beneficiary can setup PIN
- [ ] QR code scanning works
- [ ] PIN-based payments work
- [ ] Manual payments work
- [ ] Transaction history displays
- [ ] Offline payments create IOUs
- [ ] Bulk sync settles IOUs
- [ ] Admin monitoring shows stats
- [ ] Wallet state persists across pages

---

## 📊 Smart Contract Details

### Main Contract: ReliefFund.sol

**Key Functions:**

```solidity
// Admin Functions
function assignRole(address _user, uint8 _role) external onlyOwner
function allocateTokens(address _beneficiary, uint256 _amount, uint256 _expiryDuration) external
function registerMerchant(address _merchant, MerchantCategory _category, string _businessName) external

// Beneficiary Functions
function spendTokens(address _merchant, uint256 _amount, string _description) external
function setPINHash(address _user, bytes32 _pinHash) external

// Relayer Functions (Gasless)
function relaySpendTokens(address _user, address _merchant, uint256 _amount, ...) external

// View Functions
function getUserInfo(address _user) external view returns (...)
function getBeneficiaryAccount(address _beneficiary) external view returns (...)
function getMerchantProfile(address _merchant) external view returns (...)
```

**Events:**

```solidity
event TokensAllocated(address indexed beneficiary, uint256 amount, uint256 expiryDate, uint256 timestamp)
event TokensSpent(address indexed beneficiary, address indexed merchant, uint256 amount, string description, uint256 timestamp)
event MerchantRegistered(address indexed merchant, uint8 category, string businessName, uint256 timestamp)
event PINSet(address indexed user, uint256 timestamp)
event RelayedTransaction(address indexed user, address indexed merchant, uint256 amount, uint256 timestamp)
```

---

## 🔒 Security Features

### Smart Contract Security

- ✅ **Access control** - Role-based permissions
- ✅ **Reentrancy protection** - Using OpenZeppelin standards
- ✅ **Integer overflow prevention** - Solidity 0.8.x built-in
- ✅ **Emergency pause** - Admin can pause system
- ✅ **Input validation** - All parameters validated
- ✅ **Event logging** - Complete audit trail

### Backend Security

- ✅ **Environment variables** - Sensitive data protected
- ✅ **CORS configuration** - Specific origin allowed
- ✅ **Private key isolation** - Relayer wallet separated
- ✅ **Nonce verification** - Replay attack prevention
- ✅ **PIN hashing** - Keccak256 hash storage

### Frontend Security

- ✅ **Wallet signature verification** - MetaMask integration
- ✅ **Environment variable scoping** - NEXT*PUBLIC* prefix
- ✅ **XSS prevention** - React built-in protection
- ✅ **Input sanitization** - Address and amount validation
- ✅ **localStorage encryption** - Sensitive data hashed

### Production Security Checklist

- [ ] Use hardware wallet for admin operations
- [ ] Limit backend relayer wallet funds (10-20 MATIC)
- [ ] Enable Vercel/Render security headers
- [ ] Set up monitoring and alerts
- [ ] Regular security audits
- [ ] Implement rate limiting
- [ ] Add DDoS protection

---

## 🌟 Key Innovations

### 1. Disaster-Resilient Architecture

- Works offline with IOU system
- Store-and-forward mechanism
- No dependency on continuous connectivity

### 2. Zero-Cost for Victims

- Gasless transactions via meta-transactions
- Backend covers all gas fees
- Simple PIN-based authentication

### 3. Transparent & Auditable

- All transactions on blockchain
- Public verification on PolygonScan
- Complete event logging
- Real-time monitoring dashboard

### 4. Category-Restricted Spending

- Prevents misuse of relief tokens
- Merchant verification system
- Category-specific authorization

### 5. Privacy-Ready

- Infrastructure for blind signatures
- Beneficiary identity protection
- Merchant verification without exposure

---

## 📈 Roadmap

### Current Version (v1.0) ✅

- Phase 1: Relief Token System
- Phase 2: PIN & QR Payments
- Phase 3: Offline Payments
- Production deployment ready
- Polygon mainnet support

### Upcoming (v1.1) 🔄

- [ ] NFC card integration
- [ ] Blind signature implementation
- [ ] Mobile app (React Native)
- [ ] Biometric authentication
- [ ] Multi-language support

### Future (v2.0) 🎯

- [ ] Multi-token support (USDC, DAI)
- [ ] Cross-chain compatibility
- [ ] AI-powered fraud detection
- [ ] Advanced analytics dashboard
- [ ] Integration with relief organizations
- [ ] SMS-based alerts
- [ ] Offline mobile app sync

---

## 💰 Cost Analysis

### Polygon Mainnet (Production)

**Deployment:**

- Contract deployment: ~2-5 MATIC ($1.50-$3.75)
- Initial setup: ~1 MATIC ($0.75)

**Per Transaction:**

- Gasless payment (via relayer): ~0.01 MATIC ($0.008)
- Admin operations: ~0.1-0.5 MATIC ($0.08-$0.38)

**Monthly Costs (1000 transactions):**

- Backend relayer gas: ~10-15 MATIC ($7.50-$11.25)
- Backend hosting (Render): $7/month
- Frontend hosting (Vercel): Free
- **Total: ~$15-20/month**

### Local Development

- **Cost: $0** - Completely free for testing

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

**Contribution Areas:**

- Smart contract optimizations
- UI/UX improvements
- Documentation enhancements
- Bug fixes
- New feature implementations
- Security audits

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **OpenZeppelin** - Smart contract standards
- **Hardhat** - Development framework
- **Next.js** - React framework
- **Polygon** - Blockchain infrastructure
- **Alchemy** - RPC provider
- **Vercel** - Frontend hosting
- **Render** - Backend hosting

---

---


---

## 🎉 Project Status

- ✅ **Smart Contracts**: Tested and production-ready
- ✅ **Backend API**: Fully functional with offline support
- ✅ **Frontend UI**: Professional, responsive design
- ✅ **Deployment**: Configured for Vercel + Render
- ✅ **Documentation**: Comprehensive guides
- ✅ **Polygon Ready**: Mainnet deployment configured

**Status**: 🟢 Production Ready

---

**Built with ❤️ for disaster relief**

_Empowering transparent, efficient, and accessible aid distribution in times of crisis_

---

## 📊 Project Statistics

- **Smart Contract**: 750+ lines of Solidity
- **Backend**: 8 API endpoints, 2 route modules
- **Frontend**: 10+ React components, 15+ pages/sections
- **Documentation**: 5 comprehensive guides, 10,000+ words
- **Features**: 3 major phases, 40+ capabilities
- **Networks Supported**: Localhost, Mumbai Testnet, Polygon Mainnet
- **Total Lines of Code**: 5,000+

---

**Last Updated**: January 6, 2026
**Version**: 1.0.0
**Network**: Polygon Mainnet Ready
