# Tokens

This document explains how to create a token on Pi Testnet.

## Table of Contents

- [Prerequisites](#prerequisites)
- [How tokens are created](#how-tokens-are-created)
- [Steps](#steps)
- [Token Minting - Code Example](#token-minting---code-example)
- [How to be listed on Pi Wallet](#how-to-be-listed-on-pi-wallet)
- [Setting Home Domain - Code Example](#setting-home-domain---code-example)
- [Content for pi.toml](#content-for-pitoml)
- [Token Distribution](#token-distribution)
- [Additional Resources](#additional-resources)

## Prerequisites

You will need 2 testnet wallets to create a token. Create them inside the Pi Wallet and activate them on Pi Testnet. You can access your wallet's private key from the wallet's settings page.

## How tokens are created

On the Pi Blockchain, if a wallet wants to handle a token, it must first trust that token by "establishing a trustline". This protects wallets from receiving unauthorized tokens from unknown senders. When a trustline is established for the first time for a specific token, that's when the token is written on-chain. You'll see how this works in detail with examples below.

## Steps

Let's say we want to create "TestToken". We'll refer to the 2 wallets from the prerequisites as "Issuer" and "Distributor" throughout this document.

1. From the "Distributor" wallet, establish a trustline to "TestToken". Since this is the very first time a trustline is established for "TestToken", this token is now recognized on-chain. However, the total supply doesn't exist yet because the token hasn't been minted.

2. From the "Issuer" wallet, you can now send a certain amount to the "Distributor" wallet using a "Payment" operation, which is essentially "minting" the token. As we learned from the previous section, a wallet needs a trustline to handle a specific token. When a new token is registered, the very first wallet that established the trustline naturally becomes the distributor wallet because it's the only wallet that can hold the token until other wallets establish trustlines to this token.

## Token Minting - Code Example

Below is a NodeJS snippet that shows the above steps in code. This is a very naive example that shows the flow at a high level, and your production code should take care of error handling. Notice that you'll need the Stellar SDK as a dependency.

```javascript
const StellarSDK = require("@stellar/stellar-sdk");

const server = new StellarSDK.Horizon.Server("https://api.testnet.minepi.com");
const NETWORK_PASSPHRASE = "Pi Testnet";

// prepare keypairs
const issuerKeypair = StellarSDK.Keypair.fromSecret(""); // use actual secret key here
const distributorKeypair = StellarSDK.Keypair.fromSecret(""); // use actual secret key here

// define a token
// token code should be alphanumeric and up to 12 characters, case sensitive
const customToken = new StellarSDK.Asset("TestToken", issuerKeypair.publicKey());

const distributorAccount = await server.loadAccount(distributorKeypair.publicKey());

// look up base fee
const response = await server.ledgers().order("desc").limit(1).call();
const latestBlock = response.records[0];
const baseFee = latestBlock.base_fee_in_stroops;

// prepare a transaction that establishes trustline
const trustlineTransaction = new StellarSDK.TransactionBuilder(distributorAccount, {
  fee: baseFee,
  networkPassphrase: NETWORK_PASSPHRASE,
  timebounds: await server.fetchTimebounds(90),
})
  .addOperation(StellarSDK.Operation.changeTrust({ asset: customToken, limit: undefined }))
  .build();

trustlineTransaction.sign(distributorKeypair);

// submit a tx
await server.submitTransaction(trustlineTransaction);
console.log("Trustline created successfully");

//====================================================================================
// now mint TestToken by sending from issuer account to distributor account

const issuerAccount = await server.loadAccount(issuerKeypair.publicKey());

const paymentTransaction = new StellarSDK.TransactionBuilder(issuerAccount, {
  fee: baseFee,
  networkPassphrase: NETWORK_PASSPHRASE,
  timebounds: await server.fetchTimebounds(90),
})
  .addOperation(
    StellarSDK.Operation.payment({
      destination: distributorKeypair.publicKey(),
      asset: customToken,
      amount: "100000", // amount to mint
    })
  )
  .build();

paymentTransaction.sign(issuerKeypair);

// submit a tx
await server.submitTransaction(paymentTransaction);
console.log("Token issued successfully");

// checking new balance of the distributor account
const updatedDistributorAccount = await server.loadAccount(distributorKeypair.publicKey());
updatedDistributorAccount.balances.forEach((balance) => {
  if (balance.asset_type === "native") {
    console.log(`Test-Pi Balance: ${balance.balance}`);
  } else {
    console.log(`${balance.asset_code} Balance: ${balance.balance}`);
  }
});
```

## How to be listed on Pi Wallet

While the token is now minted on Pi Testnet, it won't show up in the Pi Wallet until it's recognized by Pi Server. To be listed on the Pi Wallet, you need to link your home domain to your issuer account, which you can set using the "setOptions" operation.

Before you set "Home Domain", if you check your token from `"https://api.testnet.minepi.com/assets?asset_code=<YOUR_TOKEN_CODE>&asset_issuer=<YOUR_TOKEN_ISSUER>"`, you'll notice that "href" under "toml" section is empty.

```
...
"_links": {
  "toml": {
    "href": ""
  }
}
...
```

Now you can refer to the example below to set the home domain to the issuer account.

## Setting Home Domain - Code Example

It's important that for each transaction, you need to load the account to use the latest sequence number of the account.

```javascript
const issuerAccount = await server.loadAccount(issuerKeypair.publicKey());

const setOptionsTransaction = new StellarSDK.TransactionBuilder(issuerAccount, {
  fee: baseFee,
  networkPassphrase: NETWORK_PASSPHRASE,
  timebounds: await server.fetchTimebounds(90),
})
  .addOperation(StellarSDK.Operation.setOptions({ homeDomain: "example.com" })) // replace with your actual domain
  .build();

setOptionsTransaction.sign(issuerKeypair);

await server.submitTransaction(setOptionsTransaction);
console.log("Home Domain is set successfully.");
```

After you set the "Home Domain", if you check the same page again, you'll notice that it now shows your home domain like the following.

```
...
"_links": {
  "toml": {
    "href": "https://<YOUR_DOMAIN>/.well-known/pi.toml"
  }
}
...
```

In addition to the above, a new field `"home_domain"` also appears on your issuer account page (`"https://api.testnet.minepi.com/accounts/<ISSUER_ACCOUNT_PUBLIC_KEY>"`).

Now as you might have expected, you'll need to host a `pi.toml` file at `https://<YOUR_DOMAIN>/.well-known/pi.toml`. This is a file that contains some metadata of your token and is a way of proving that the token is associated with the domain. Make sure this file is publicly accessible and served as plain text on your server (`content-type: text/plain`).

## Content for pi.toml

There are a couple of required token-related fields which should be available for Pi server to verify. Below is an example. Since this is a text file that represents any metadata, you may include additional fields.

If one issuer issues multiple tokens, each token should have its own `[[CURRENCIES]]` section.

```toml
[[CURRENCIES]]
code="TestToken"
issuer="GCNCQ6RRVEERQXWGKB3XMRK6VGJRIHGT5UTDAAU6QEU5NL2AHFOJDYLC"
name="Pi Core Team"
desc="This is a test token that is created as an example and has no value."
image="https://image-of-your-token.com/image.png"
```

> ### These are REQUIRED fields to be verified.
>
> - code: the code of the token
> - issuer: the public key of the token issuer
> - name: the name of the token issuer
> - desc: a simple description of the token
> - image: an image that contains the icon of the token

### Important notes:

- After you set the home domain and complete hosting a valid `pi.toml` file, once it's scanned by Pi Server, your token will start appearing in the Pi Wallet. Tokens on the Pi Blockchain are regularly scanned and if verification fails for some reason, e.g. missing fields or image not reachable, previously listed tokens can be delisted from the Pi Wallet. It's highly recommended that your `pi.toml` and `image` files are properly cached.
- Your `pi.toml` and `image` files should be accessible via `https`, otherwise the validation will fail.

## Token Distribution

There are a couple of ways of distributing tokens, but here we will explore 2 simple ways. As a reminder, the recipient must add your token in the Pi Wallet. When your token shows up in the Pi Wallet, users can select your token and enable (i.e. create a trustline) within the Pi Wallet UI.

1. **Direct Payment Flow**

   Assuming that a recipient has created a trustline for your token, you can use the "payment" operation from the distributor account, just like what we did from the issuer account to the distributor account in the [Token Minting - Code Example](#token-minting---code-example) section.

2. **Create Liquidity Pool**

   Since users have access to Test-Pi via faucet, another way is to create a Liquidity Pool (LP) and have users get some of your token from the pool directly.

   a. In the Pi Wallet, go to "Tokens" page, then click on "Liquidity Pools" icon. Select "My Pools" tab and at the bottom, you'll see that you can create a new LP. Select "Test-Pi" and your token with the desired amount. Once it's created, the pool will show up under "All" tab.

   b. As a user, assuming I already added your token to my wallet, I can go to "Tokens" page, then click on "Swap" icon. The `From` token is "Test-Pi" and the `To` token will be your token. After selecting the token, I can type in the amount I'm willing to swap. As soon as I type the amount for the `From` section, the corresponding `To` amount will be automatically populated. I can then simply swap and now have your token.

## Additional Resources

If you want to know more about advanced features, please check the following pages. It's HIGHLY RECOMMENDED that you check out the last link to configure the maximum supply and lock the issuing account.

- [Stellar Documentation](https://developers.stellar.org)
- [Stellar JS SDK Documentation](https://stellar.github.io/js-stellar-sdk)
- [Token Best Practices](https://developers.stellar.org/docs/tokens/how-to-issue-an-asset)
