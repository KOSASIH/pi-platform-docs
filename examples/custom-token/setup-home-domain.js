require('dotenv').config();
const StellarSDK = require('@stellar/stellar-sdk');

const server = new StellarSDK.Horizon.Server('https://api.testnet.minepi.com');
const issuerKeypair = StellarSDK.Keypair.fromSecret(process.env.ISSUER_SECRET);

async function setup() {
  try {
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
    const result = await server.submitTransaction(tx);
    console.log("✅ Home Domain Successfully Set to:", process.env.HOMEDOMAIN);
    console.log("Tx Hash:", result.hash);
  } catch (e) {
    console.error("❌ Error:", e.response?.data?.extras?.result_codes || e);
  }
}
setup();
