# Deployment Guide - P2P Lending Platform

This guide provides detailed instructions for setting up the blockchain network, managing identities, and deploying the various services of the P2P Lending Platform.

## Prerequisites

- **Node.js**: Version 18+
- **Docker & Docker Compose**: 
    > [!WARNING]
    > It is highly recommended to use **Docker Desktop v4.21.1 or older**. Latest versions of Docker may have compatibility issues with certain Hyperledger Fabric components (especially CA and chaincode deployment).
- **Python**: Version 3.11 (for AI services)
- **MongoDB**: Local or Docker instance

## Demo Accounts

You can use the following accounts to test the system after deployment:

### 1. Admin Portal
- **Phone**: `0900000000`
- **Password**: `admin123`

### 2. Mobile App (Borrower)
- **Phone**: `0901234567`
- **Password**: `Password123`

### 3. Mobile App (Lender)
- **Phone**: `0987654321` (Example)
- **Password**: `Password123`

---

## 1. Blockchain Network Setup
Navigate to your `fabric-samples/test-network` directory and run:

```bash
# Bring down any existing network
./network.sh down

# Start the network with Certificate Authority (CA) and create a channel
./network.sh up createChannel -ca -c mychannel
```

### Deploy Chaincode
Deploy the P2P Lending chaincode to the channel:

```bash
./network.sh deployCC -ccn p2plending -ccp <path_to_p2p_lending>/blockchain/chaincode -ccv 1 -ccl javascript
```

## 2. Identity & Wallet Management

The `getWallet` module is used to interact with the Fabric CA and manage identities for the application.

### Setup getWallet
1. Navigate to the `getWallet` directory:
   ```bash
   cd getWallet
   npm install
   ```

2. **Enroll Admin**: Generate the administrator credentials for the organization.
   ```bash
   node enroll-admin.js
   ```
   If successful, a `wallet` directory will be created containing the `admin` identity.

3. **Verify Connection**:
   ```bash
   node check-blockchain.js
   ```

## 3. Configuration Sync

After successfully enrolling the admin, you must sync the configuration to the main server.

1. **Copy Wallet**:
   Copy the generated `wallet` folder from `getWallet` to the `server` directory.

2. **Copy Organizations**:
   Copy the `organizations` folder from the `fabric-samples/test-network` directory to the `server` directory.

## 4. Backend Service Deployment

### Environment Configuration
Create a `.env` file in the `server` directory by copying from `.env.example`:

```bash
cd server
cp .env.example .env
```
Update the `.env` file with your specific configurations (Database URI, JWT secrets, Twilio credentials, etc.).

### Run the Server
```bash
npm install
npm run dev
```

## 5. Frontend & Other Services

### Admin Portal
```bash
cd admin-web
npm install
cp .env.example .env
npm run dev
```

### Blockchain Explorer
```bash
cd explorer-web
npm install
cp .env.example .env
npm run dev
```

### eKYC Service
Ensure Docker is running and start the eKYC service:
```bash
cd ekyc_service
docker-compose up --build
```

### Mobile Application
```bash
cd client
yarn install
npx expo start
```

## Troubleshooting

- **Hyperledger Fabric Errors**: Ensure all Docker containers are running (`docker ps`).
- **Permission Denied**: Use `sudo` for file copying operations between directories if necessary.
- **Connection Refused**: Verify that the `VITE_API_URL` in frontend `.env` files matches the running server address.

---
© 2026 P2P Lending Project.
