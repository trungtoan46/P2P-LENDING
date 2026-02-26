# P2P Lending Platform - Blockchain & AI Integrated

A modern Peer-to-Peer (P2P) Lending platform integrating Blockchain technology for transparency and Artificial Intelligence (AI) for automated credit scoring. This system is designed to streamline the connection between borrowers and lenders while ensuring high security, data integrity, and automated risk assessment.

## Key Features

### Blockchain-backed Immutability
Leverages Hyperledger Fabric to store financial transactions and loan contracts. This ensures data integrity, non-repudiation, and provides a transparent audit trail for the entire system.

### AI Credit Scoring
Employs machine learning models to analyze user data and financial history. The system automatically calculates credit scores, categorizing risks and supporting fast, accurate lending decisions.

### Advanced Matching Engine
An intelligent algorithm that matches loan requests from Borrowers with suitable investment packages from Lenders based on interest rates, terms, and risk levels.

### Auto-Investment
Allows lenders to set up automated investment criteria, enabling the system to allocate capital to matching loan requests, optimizing investment performance.

### Electronic KYC (eKYC)
Integrates an independent eKYC service using OCR and Face Recognition technologies to verify user identity securely and accurately.

### Blockchain Explorer
Provides a public lookup interface allowing users to track blocks and transaction history on the blockchain network in real-time.

## Technology Stack

### Mobile Application
- Framework: React Native (Expo)
- Navigation: React Navigation
- State Management: React Context and Hooks

### Backend Services
- Language & Framework: Node.js, Express
- Database: MongoDB (Mongoose)
- Authentication: JSON Web Token (JWT) with Refresh Token system
- Messaging: OTP via Twilio service

### Blockchain Infrastructure
- Platform: Hyperledger Fabric 2.x
- Chaincode Language: Go / JavaScript
- SDK: Fabric SDK for Node.js

### AI & Deep Learning
- Frameworks: PyTorch, facenet-pytorch, YOLO, VietOCR
- AI API: Flask

## Project Structure

- `/client`: Mobile application for end-users (Borrower & Lender).
- `/server`: Main API Gateway, handling business logic and Blockchain integration.
- `/admin-web`: Administrative portal for system operators.
- `/explorer-web`: Public blockchain data lookup website.
- `/blockchain`: Blockchain network configurations and Chaincode source code.
- `/ekyc_service`: Electronic identity verification service.
- `/CreditScoring`: AI training resources and credit scoring models.

## Quick Start

### Prerequisites
- Node.js 18+
- Docker and Docker Compose (required for Blockchain and AI services)
- Python 3.11 (required for machine learning modules)
- MongoDB

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/trungtoan46/P2P-Lending.git
   cd P2P-Lending
   ```

2. **Environment Configuration**:
   Follow the detailed instructions in [DEPLOYMENT.md](DEPLOYMENT.md) to set up `.env` files and blockchain identities.

3. **Run Backend**:
   ```bash
   cd server
   npm install
   npm run dev
   ```

4. **Run Mobile App**:
   ```bash
   cd client
   yarn install
   npx expo start
   ```

## Detailed Documentation

For comprehensive instructions on deploying the blockchain network, setting up wallets, and running all services, please refer to the **[DEPLOYMENT.md](DEPLOYMENT.md)** guide.

---

## Credits

This project is inherited and developed from the following repository:
- **Source**: [thiennguyen0196/P2PLending-Blockchain](https://github.com/thiennguyen0196/P2PLending-Blockchain.git)
- **Original Authors**: Thien Nguyen and contributors.

We sincerely appreciate the initial contributions from the original project authors which laid the foundation for the advanced features implemented in this version.

---
© 2026 P2P Lending Project. Licensed under [MIT](LICENSE.md).
