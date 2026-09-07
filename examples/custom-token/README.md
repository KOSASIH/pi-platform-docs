# Example: Mint a Custom Token on Pi Network

This folder contains a complete example of how to create and distribute a Custom Asset / Token on the Pi Network.
Pi Network uses the Stellar Protocol, so our token = a Stellar Asset.

Example token: `$EXAMPLE`
```
---

## 1. Prerequisites

```
1.  **Node.js v18+** installed
2.  **2 Pi Testnet Wallets**: 1 for Issuer, 1 for Distributor
    Get them from: https://wallet.pinet.com
3.  **Testnet Pi** in both wallets for fees. Claim at: https://blockexplorer.minepi.com
4.  **Install Dependencies**
    ```bash
    npm init -y
    npm install @stellar/stellar-sdk dotenv
    ```
---

## 2. File Structure
```
examples/custom-token/
├── .env.example              # Template for secret keys
├── setup-home-domain.js      # Step 1: Register domain so token appears in Pi Wallet
├── mint-token.js             # Step 2: Create token and distribute supply
└── README.md                 # This file
```
---

## 3. How to Use

### Step 1: Setup .env
Copy the file and add your secret keys
```
cp .env.example .env
```
Fill in `.env`:
```
ISSUER_SECRET=SA...        # Secret key of Issuer wallet. The one who mints the token
DISTRIBUTOR_SECRET=SB...   # Secret key of Distributor wallet. The one who distributes
TOKEN_CODE=EXAMPLE         # Max 12 characters. UPPERCASE. Example token name
TOTAL_SUPPLY=1000000000    # Initial total supply
HOMEDOMAIN=your-domain.com # Your domain. You can use github.io for testing
```
`IMPORTANT`: Never push your `.env` file to GitHub

### Step 2: Set Home Domain
This is required for the token name and logo to appear in Pi Wallet
```
node setup-home-domain.js
```
This script sets the `home_domain` on the Issuer account.

Verify here: `https://api.testnet.minepi.com/accounts/YOUR_ISSUER_ADDRESS`

### Step 3: Mint Token
Run this to create the token and send the initial supply to the distributor
```
node mint-token.js
```
Result: `$EXAMPLE` token will now be in the Distributor wallet and can be transferred.

Check on Block Explorer: `https://blockexplorer.minepi.com/testnet/assets?code=EXAMPLE`

---

## 4. Key Code Snippets

### `setup-home-domain.js`
Purpose: Give identity to your token
```
require('dotenv').config();
const StellarSDK = require('@stellar/stellar-sdk');

const server = new StellarSDK.Horizon.Server('https://api.testnet.minepi.com');
const issuerKeypair = StellarSDK.Keypair.fromSecret(process.env.ISSUER_SECRET);

async function setup() {
  const account = await server.loadAccount(issuerKeypair.publicKey());
  const tx = new StellarSDK.TransactionBuilder(account, {
      fee: await server.fetchBaseFee(),
      networkPassphrase: 'Pi Testnet'
    })
    .addOperation(StellarSDK.Operation.setOptions({
      homeDomain: process.env.HOMEDOMAIN
    }))
    .setTimeout(30)
    .build();
  tx.sign(issuerKeypair);
  await server.submitTransaction(tx);
  console.log("Home Domain Successfully Set!");
}
setup();
```

### `mint-token.js`
Purpose: Create the token and do initial distribution
```
require('dotenv').config();
const StellarSDK = require('@stellar/stellar-sdk');

const server = new StellarSDK.Horizon.Server('https://api.testnet.minepi.com');
const issuer = StellarSDK.Keypair.fromSecret(process.env.ISSUER_SECRET);
const distributor = StellarSDK.Keypair.fromSecret(process.env.DISTRIBUTOR_SECRET);
const token = new StellarSDK.Asset(process.env.TOKEN_CODE, issuer.publicKey());

async function mint() {
  // 1. Distributor must establish trustline first
  // 2. Issuer sends token to distributor
  console.log(`Token ${process.env.TOKEN_CODE} successfully minted!`);
}
mint();
```
_Note: Full code is in the `mint-token.js` file. This is just a snippet._

---

## 5. Important Pi Network Rules

1.  *Testnet Only*: Custom tokens are currently only supported on Testnet. Mainnet is still restricted.
2.  *Payments in Pi Browser*: Transactions inside Pi Browser must use `Pi Coin`. Custom tokens are for in-app use only.
3.  *Security*: The Issuer has full control. Can freeze/burn tokens. Keep `ISSUER_SECRET` safe.
4.  *Example Purpose*: This `$EXAMPLE` token is for education only. Not for real use.

---
## 6. Troubleshooting - One Click Fix

Jalankan script ini kalau ketemu error:

| Error | Cause | Command to Fix |
| --- | --- | --- |
| `op_no_trust` | Distributor has no trustline | `node troubleshoot.js no_trust` |
| `op_low_reserve` | Not enough Pi for reserve | `node troubleshoot.js low_reserve` |
| Token not showing in Wallet | Home Domain not set | `node troubleshoot.js not_showing` |

---

Need help? Open an Issue in this repo or ask in the Pioneer Dev Discord.

Made with ❤️ for Pi Developers

---
