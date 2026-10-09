# ⛓ Hyperledger Fabric Production Deployment Guide for CivicChain

This guide provides instructions to run the CivicChain network on a multi-organization Hyperledger Fabric permissioned blockchain.

---

## 🏛 Network Architecture

CivicChain operates on a multi-peer, multi-organization Fabric network topology:

```
                          ┌───────────────────────────┐
                          │   Raft Ordering Service   │
                          │     orderer.example.com   │
                          └─────────────┬─────────────┘
                                        │
                         Channel: "civicchannel"
                                        │
           ┌────────────────────────────┴────────────────────────────┐
           ▼                                                         ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────────────┐
│  Org1: Municipal Administration      │  │  Org2: Citizen Oversight & Verifiers │
│  - Peer: peer0.org1.civicchain.gov   │  │  - Peer: peer0.org2.civicchain.gov   │
│  - MSP: Org1MSP                      │  │  - MSP: Org2MSP                      │
│  - CA: ca.org1.civicchain.gov        │  │  - CA: ca.org2.civicchain.gov        │
└──────────────────────────────────────┘  └──────────────────────────────────────┘
                   │                                         │
                   └─────────────────┬───────────────────────┘
                                     │
                     ┌───────────────▼──────────────┐
                     │ Smart Contract: "civicchain" │
                     │   - Lifecycle Transitions    │
                     │   - Evidence Anchoring       │
                     │   - Tamper-Evident History   │
                     └──────────────────────────────┘
```

---

## 📋 Prerequisites

1. **Docker Desktop** (with WSL 2 backend on Windows) or Docker Engine on Linux.
2. **Git** and **cURL**.
3. **Node.js** (v18.x or v20.x).

---

## 🚀 Step-by-Step Deployment

### 1. Download Hyperledger Fabric Binaries and Samples
In WSL or Linux terminal:
```bash
curl -sSLO https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh && chmod +x install-fabric.sh
./install-fabric.sh --fabric-version 2.5.4 --ca-version 1.5.7 binary samples
```
Ensure Fabric binaries are in your environment PATH:
```bash
export PATH=${PWD}/fabric-samples/bin:$PATH
```

### 2. Start the Fabric Test Network with Channel
```bash
cd fabric-samples/test-network
./network.sh down
./network.sh up createChannel -c civicchannel -ca
```

### 3. Deploy the CivicChain Smart Contract (Chaincode)
Deploy the Node.js chaincode located in `blockchain/chaincode`:
```bash
./network.sh deployCC \
  -c civicchannel \
  -ccn civicchain \
  -ccp ../../blockchain/chaincode \
  -ccl javascript \
  -ccep "OR('Org1MSP.peer','Org2MSP.peer')"
```

### 4. Configure Backend Environment for Fabric Mode
Edit `backend/.env`:
```env
# Switch from 'mock' to 'fabric'
BLOCKCHAIN_MODE=fabric

# Fabric Connection Configuration
FABRIC_MSP_ID=Org1MSP
FABRIC_CHANNEL_NAME=civicchannel
FABRIC_CONTRACT_NAME=civicchain
FABRIC_CCP_PATH=../blockchain/network/connection-org1.json
FABRIC_KEY_PATH=../../fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp/keystore/priv_sk
FABRIC_CERT_PATH=../../fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp/signcerts/User1@org1.example.com-cert.pem
```

### 5. Restart CivicChain Backend
```bash
cd backend
npm start
```
The backend will automatically initialize `@hyperledger/fabric-gateway` and connect to the live endorsing peers!

---

## 🔍 Fabric Transaction Verification via CLI

You can query the on-chain World State directly using the `peer` CLI:

```bash
# Query Complaint state
peer chaincode query \
  -C civicchannel \
  -n civicchain \
  -c '{"Args":["getComplaint","COMPLAINT_UUID"]}'

# Query Immutable Transaction History
peer chaincode query \
  -C civicchannel \
  -n civicchain \
  -c '{"Args":["getComplaintHistory","COMPLAINT_UUID"]}'
```
