const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;
const DB_FILE = path.join(__dirname, "accounts.json");
const FRONTEND_DIR = path.join(__dirname, "..", "frontend");

app.use(cors());
app.use(express.json());
app.use(express.static(FRONTEND_DIR));

// ---------- Simple JSON file "database" ----------
function loadAccounts() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({}, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
}

function saveAccounts(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ---------- Routes ----------

// Create a new account
app.post("/api/accounts", (req, res) => {
  const { name, balance } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Name is required." });
  }

  const accounts = loadAccounts();
  const id = Date.now().toString();

  accounts[id] = {
    id,
    name,
    balance: Number(balance) || 0,
    history: [
      {
        type: "opening",
        amount: Number(balance) || 0,
        balanceAfter: Number(balance) || 0,
        date: new Date().toISOString(),
      },
    ],
  };

  saveAccounts(accounts);
  res.status(201).json(accounts[id]);
});

// Get all accounts
app.get("/api/accounts", (req, res) => {
  const accounts = loadAccounts();
  res.json(Object.values(accounts));
});

// Get single account (display)
app.get("/api/accounts/:id", (req, res) => {
  const accounts = loadAccounts();
  const account = accounts[req.params.id];
  if (!account) return res.status(404).json({ error: "Account not found." });
  res.json(account);
});

// Deposit
app.post("/api/accounts/:id/deposit", (req, res) => {
  const accounts = loadAccounts();
  const account = accounts[req.params.id];
  if (!account) return res.status(404).json({ error: "Account not found." });

  const amount = Number(req.body.amount);
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Deposit amount must be positive." });
  }

  account.balance += amount;
  account.history.push({
    type: "deposit",
    amount,
    balanceAfter: account.balance,
    date: new Date().toISOString(),
  });

  saveAccounts(accounts);
  res.json(account);
});

// Withdraw
app.post("/api/accounts/:id/withdraw", (req, res) => {
  const accounts = loadAccounts();
  const account = accounts[req.params.id];
  if (!account) return res.status(404).json({ error: "Account not found." });

  const amount = Number(req.body.amount);
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Withdrawal amount must be positive." });
  }
  if (amount > account.balance) {
    return res.status(400).json({ error: "Insufficient balance." });
  }

  account.balance -= amount;
  account.history.push({
    type: "withdraw",
    amount,
    balanceAfter: account.balance,
    date: new Date().toISOString(),
  });

  saveAccounts(accounts);
  res.json(account);
});

// Delete account (optional, handy for testing)
app.delete("/api/accounts/:id", (req, res) => {
  const accounts = loadAccounts();
  if (!accounts[req.params.id]) {
    return res.status(404).json({ error: "Account not found." });
  }
  delete accounts[req.params.id];
  saveAccounts(accounts);
  res.json({ success: true });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`SmartATM running on port ${PORT}`);
});
