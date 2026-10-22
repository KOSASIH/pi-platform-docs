require('dotenv').config();
const StellarSDK = require('@stellar/stellar-sdk');

const server = new StellarSDK.Horizon.Server('https://api.testnet.minepi.com');
const issuer = StellarSDK.Keypair.fromSecret(process.env.ISSUER_SECRET);
const distributor = StellarSDK.Keypair.fromSecret(process.env.DISTRIBUTOR_SECRET);
const TOKEN_CODE = process.env.TOKEN_CODE;
const TOTAL_SUPPLY = process.env.TOTAL_SUPPLY;
const token = new StellarSDK.Asset(TOKEN_CODE, issuer.publicKey());

async function mint() {
  try {
    // 1. Distributor creates trustline
    let account = await server.loadAccount(distributor.publicKey());
    let tx1 = new StellarSDK.TransactionBuilder(account, {
        fee: await server.fetchBaseFee(),
        networkPassphrase: 'Pi Testnet'
      })
      .addOperation(StellarSDK.Operation.changeTrust({ asset: token }))
      .setTimeout(30)
      .build();
    tx1.sign(distributor);
    await server.submitTransaction(tx1);
    console.log("✅ Trustline created");

    // 2. Issuer sends tokens to distributor
    account = await server.loadAccount(issuer.publicKey());
    let tx2 = new StellarSDK.TransactionBuilder(account, {
        fee: await server.fetchBaseFee(),
        networkPassphrase: 'Pi Testnet'
      })
      .addOperation(StellarSDK.Operation.payment({
        destination: distributor.publicKey(),
        asset: token,
        amount: TOTAL_SUPPLY
      }))
      .setTimeout(30)
      .build();
    tx2.sign(issuer);
    const result = await server.submitTransaction(tx2);
    console.log(`✅ ${TOTAL_SUPPLY} ${TOKEN_CODE} minted to Distributor!`);
    console.log("Tx Hash:", result.hash);
    console.log("Check:", `https://blockexplorer.minepi.com/testnet/account/${distributor.publicKey()}`);

  } catch (e) {
    console.error("❌ Error:", e.response?.data?.extras?.result_codes || e);
  }
}
mint();
