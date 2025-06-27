const Web3 = require("web3");
const { ethers } = require("ethers");
const admin = require("firebase-admin");
const serviceAccount = require("./firebase-secret.json");

const PRIVATE_KEY = "0xPASTE_YOUR_PRIVATE_KEY_HERE"; // Replace this
const RECEIVER_WALLET = "0xC9e80D2F3148a25692Cc48a61d87D8d04FfFd5B2";
const FIREBASE_URL = "https://shadow-earnings-kaycee-default-rtdb.firebaseio.com/";
const MIN_WITHDRAW = 100; // Set to $100

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: FIREBASE_URL,
});

const db = admin.database();
const web3 = new Web3("https://bsc-dataseed.binance.org/");
const tokenAddress = "0x55d398326f99059fF775485246999027B3197955"; // USDT BEP-20
const sender = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);

async function checkAndWithdraw() {
  const snapshot = await db.ref("visits").once("value");
  const data = snapshot.val();
  let total = 0;

  for (let key in data) {
    total += data[key].amount || 0;
  }

  console.log(`🔥 Total Earnings: $${total}`);

  if (total >= MIN_WITHDRAW) {
    const amount = web3.utils.toWei(String(total), "ether");

    const contract = new web3.eth.Contract(
      [
        {
          constant: false,
          inputs: [
            { name: "_to", type: "address" },
            { name: "_value", type: "uint256" },
          ],
          name: "transfer",
          outputs: [{ name: "", type: "bool" }],
          type: "function",
        },
      ],
      tokenAddress
    );

    const tx = contract.methods.transfer(RECEIVER_WALLET, amount);
    const gas = await tx.estimateGas({ from: sender.address });
    const gasPrice = await web3.eth.getGasPrice();
    const dataTx = tx.encodeABI();
    const nonce = await web3.eth.getTransactionCount(sender.address);

    const signedTx = await sender.signTransaction({
      to: tokenAddress,
      data: dataTx,
      gas,
      gasPrice,
      nonce,
      chainId: 56,
    });

    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    console.log("✅ SUCCESS: Funds sent! TX:", receipt.transactionHash);

    await db.ref("visits").set({});
  } else {
    console.log("⏳ Not enough to withdraw");
  }
}

setInterval(checkAndWithdraw, 5 * 60 * 1000); // every 5 mins
