# Example: Mint a Custom Token on Pi Network

This folder contains a complete example of how to create and distribute a Custom Asset / Token on the Pi Network.
Pi Network uses the Stellar Protocol, so our token = a Stellar Asset.

Example token: `$AEGIS`

---

## 1. Prerequisites

1.  **Node.js v18+** installed
2.  **2 Pi Testnet Wallets**: 1 for Issuer, 1 for Distributor
    Get them from: https://wallet.pi
3.  **Testnet Pi** in both wallets for fees. Claim at: https://pi-blockchain.net
4.  **Install Dependencies**
    ```bash
    npm init -y
    npm install @stellar/stellar-sdk dotenv
