const Web3 = require('web3');
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-secret.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://shadow-earnings-kaycee-default-rtdb.firebaseio.com/",
});

const db = admin.database();
const web3 = new Web3("https://bsc-dataseed.binance.org/"); // Binance Smart Chain

const PRIVATE_KEY = process.env.SENDER_PRIVATE_KEY;
const RECEIVER = process.env.RECEIVER_WALLET;

const USDT_ABI = [{
  constant: false,
  inputs: [
    { name: "_to", type: "address" },
    { name: "_value", type: "uint256" }
  ],
  name: "transfer",
  outputs: [{ name: "", type: "bool" }],
  type: "function"
}];

const USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955"; // USDT token contract (BEP-20)
const USDT = new web3.eth.Contract(USDT_ABI, USDT_ADDRESS);

async function checkAndWithdraw() {
  const snapshot = await db.ref("visits").once("value");
  const data = snapshot.val();
  let total = 0;

  for (let key in data) {
    total += data[key].amount || 0;
  }

  if (total >= 100) {
    const account = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
    const amount = web3.utils.toWei(total.toString(), 'mwei'); // USDT has 6 decimals

    const tx = {
      from: account.address,
      to: USDT_ADDRESS,
      gas: 100000,
      data: USDT.methods.transfer(RECEIVER, amount).encodeABI()
    };

    try {
      const signedTx = await account.signTransaction(tx);
      const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
      console.log("✅ Withdrawal sent:", receipt.transactionHash);

      await db.ref("visits").remove(); // Reset visits after withdrawal
    } catch (error) {
      console.error("❌ Transaction failed:", error.message);
    }
  } else {
    console.log(`Not enough earnings. Current: $${total.toFixed(2)}`);
  }
}

checkAndWithdraw();
