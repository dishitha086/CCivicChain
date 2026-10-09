#!/bin/bash
# CivicChain - Hyperledger Fabric Network Initialization & Chaincode Deployment Script
set -e

CHANNEL_NAME="civicchannel"
CC_NAME="civicchain"
CC_VERSION="1.0"
CC_SEQUENCE="1"
CC_SRC_PATH="../chaincode"

echo "=========================================================="
echo "    CivicChain Hyperledger Fabric Network Deployment     "
echo "=========================================================="

if ! command -v peer &> /dev/null; then
    echo "⚠️ 'peer' binary not found in PATH."
    echo "Please ensure Fabric binaries (fabric-samples/bin) are added to your PATH or WSL."
    echo "Refer to docs/FABRIC_SETUP.md for step-by-step instructions."
    exit 1
fi

echo "1. Packaging Chaincode..."
peer lifecycle chaincode package ${CC_NAME}.tar.gz \
  --path ${CC_SRC_PATH} \
  --lang node \
  --label ${CC_NAME}_${CC_VERSION}

echo "2. Chaincode packaged successfully as ${CC_NAME}.tar.gz"
echo "3. Ready for installation on Org1 and Org2 peers."
