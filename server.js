const express = require("express");
const app = express();
const axios = require("axios");

const PORT = process.env.PORT || 3000;
const PINGS_PER_MINUTE = parseInt(process.env.PING_RATE) || 1000;
const PINGS_PER_SECOND = Math.floor(PINGS_PER_MINUTE / 60);

const FIREBASE_URL = "https://shadow-earnings-kaycee-default-rtdb.firebaseio.com/visits.json";
const WALLET = "0xC9e80D2F3148a25692Cc48a61d87D8d04FfFd5B2";
const EARNING_PER_PING = 0.0005;

// Ping Firebase repeatedly
setInterval(async () => {
  for (let i = 0; i < PINGS_PER_SECOND; i++) {
    const now = new Date().toISOString();
    try {
      await axios.post(FIREBASE_URL, {
        ip: "ghost",
        time: now,
        wallet: WALLET,
        amount: EARNING_PER_PING
      });
      console.log(`👻 Ghost ping sent at ${now}`);
    } catch (err) {
      console.error("Ping failed", err.message);
    }
  }
}, 1000);

app.get("/", (req, res) => {
  res.send("👻 Ghost Injector Running...");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Ghost server live at http://0.0.0.0:${PORT}`);
});
