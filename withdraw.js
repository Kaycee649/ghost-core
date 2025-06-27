const admin = require('firebase-admin');
const ethers = require('ethers');

// Load Firebase service account from Render's secret file system
const serviceAccount = require('/etc/secrets/firebase-secret.json');

// ✅ Use YOUR exact Firebase database URL (same as your dashboard)
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://shadow-earnings-kaycee-default-rtdb.firebaseio.com/'
});

const db = admin.database();
const earningsRef = db.ref('totalEarnings');

// Read from Render Environment
const PRIVATE_KEY = process.env.SENDER_PRIVATE_KEY;
const RECEIVER_WALLET = process.env.RECEIVER_WALLET;

const NETWORK = "https://bsc-dataseed.binance.org/";
const provider = new ethers.JsonRpcProvider(NETWORK);

const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const usdtContract = new ethers.Contract(
  '0x55d398326f99059fF775485246999027B3197955', // USDT (BEP-20)
  ['function transfer(address to, uint amount) public returns (bool)'],
  wallet
);

// Watch for changes in earnings
earningsRef.on('value', async (snapshot) => {
  const earnings = snapshot.val() || 0;
  console.log('📊 Earnings: $' + earnings);

  if (earnings >= 100) {
    console.log('🚀 Reached $100 — withdrawing...');
    const amount = ethers.parseUnits('100', 18);

    try {
      const tx = await usdtContract.transfer(RECEIVER_WALLET, amount);
      console.log("✅ TX Sent:", tx.hash);

      await tx.wait();
      console.log("✅ Confirmed. Earnings reset.");

      await earningsRef.set(0);
    } catch (error) {
      console.error("❌ Withdrawal Failed:", error);
    }
  }
});
