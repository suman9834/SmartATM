const API = window.location.port === "3000"
  ? "http://localhost:5000/api/accounts"
  : "/api/accounts";
const STORAGE_KEY = "atm-accounts-cache";

let accounts = [];
let activeId = null;

const accountList = document.getElementById("account-list");
const emptyState = document.getElementById("empty-state");
const passbookContent = document.getElementById("passbook-content");
const holderName = document.getElementById("holder-name");
const balanceAmount = document.getElementById("balance-amount");
const ledgerBody = document.getElementById("ledger-body");
const errorMessage = document.getElementById("error-message");
const totalDeposits = document.getElementById("total-deposits");
const totalWithdrawals = document.getElementById("total-withdrawals");
const transactionCount = document.getElementById("transaction-count");

function saveAccountsToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

function loadAccountsFromStorage() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function formatCurrency(amount) {
  return `₹${Number(amount).toFixed(2)}`;
}

function readAmount(value, label) {
  if (value.trim() === "") throw new Error(`${label} amount is required.`);
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`${label} amount must be a positive number.`);
  }
  return amount;
}

async function fetchAccounts() {
  try {
    const res = await fetch(API);
    if (!res.ok) throw new Error("Unable to load accounts.");
    accounts = await res.json();
    saveAccountsToStorage();
  } catch {
    accounts = loadAccountsFromStorage();
    showError("Offline mode: showing your saved accounts.");
  }
  renderAccountList();
  if (activeId) {
    const current = accounts.find((a) => a.id === activeId);
    if (current) renderPassbook(current);
  }
}

function renderAccountList() {
  accountList.innerHTML = "";
  accounts.forEach((acc) => {
    const item = document.createElement("div");
    item.className = "account-item" + (acc.id === activeId ? " active" : "");
    item.innerHTML = `
      <span class="name">${acc.name}</span>
      <span class="bal">₹${acc.balance.toFixed(2)}</span>
    `;
    item.addEventListener("click", () => {
      activeId = acc.id;
      renderAccountList();
      renderPassbook(acc);
    });
    accountList.appendChild(item);
  });
}

function renderPassbook(acc) {
  emptyState.hidden = true;
  passbookContent.hidden = false;
  errorMessage.hidden = true;

  holderName.textContent = acc.name;
  balanceAmount.textContent = acc.balance.toFixed(2);

  const deposits = acc.history
    .filter((entry) => entry.type === "deposit")
    .reduce((sum, entry) => sum + Number(entry.amount), 0);
  const withdrawals = acc.history
    .filter((entry) => entry.type === "withdraw")
    .reduce((sum, entry) => sum + Number(entry.amount), 0);
  totalDeposits.textContent = formatCurrency(deposits);
  totalWithdrawals.textContent = formatCurrency(withdrawals);
  transactionCount.textContent = acc.history.length;

  ledgerBody.innerHTML = "";
  [...acc.history].reverse().forEach((entry) => {
    const row = document.createElement("div");
    row.className = "ledger-row";
    const date = new Date(entry.date);
    row.innerHTML = `
      <span class="type-${entry.type}">${entry.type}</span>
      <span>₹${entry.amount.toFixed(2)}</span>
      <span>₹${entry.balanceAfter.toFixed(2)}</span>
      <span>${date.toLocaleString()}</span>
    `;
    ledgerBody.appendChild(row);
  });
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = false;
}

function clearError() {
  errorMessage.hidden = true;
  errorMessage.textContent = "";
}

function downloadStatement(acc) {
  const rows = [
    ["Account holder", acc.name],
    ["Current balance", acc.balance.toFixed(2)],
    [],
    ["Type", "Amount", "Balance after", "Date"],
    ...acc.history.map((entry) => [
      entry.type,
      Number(entry.amount).toFixed(2),
      Number(entry.balanceAfter).toFixed(2),
      new Date(entry.date).toLocaleString(),
    ]),
  ];
  const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${acc.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "account"}-statement.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

document.getElementById("export-button").addEventListener("click", () => {
  const account = accounts.find((item) => item.id === activeId);
  if (account) downloadStatement(account);
});

document.getElementById("delete-button").addEventListener("click", async () => {
  const account = accounts.find((item) => item.id === activeId);
  if (!account || !confirm(`Close the account for ${account.name}? This cannot be undone.`)) return;

  try {
    const res = await fetch(`${API}/${activeId}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Unable to close account.");
  } catch {
    showError("Could not close the account. Please try again.");
    return;
  }

  accounts = accounts.filter((item) => item.id !== activeId);
  activeId = null;
  saveAccountsToStorage();
  renderAccountList();
  passbookContent.hidden = true;
  emptyState.hidden = false;
});

// ---------- Create account ----------
document.getElementById("new-account-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();
  const name = document.getElementById("new-name").value.trim();
  const balance = document.getElementById("new-balance").value;

  if (!name) return showError("Account holder name is required.");
  let openingBalance;
  try {
    openingBalance = balance.trim() === "" ? 0 : Number(balance);
    if (!Number.isFinite(openingBalance) || openingBalance < 0) {
      throw new Error("Opening balance must be zero or a positive number.");
    }
  } catch (error) {
    return showError(error.message);
  }

  try {
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, balance: openingBalance }),
    });
    const account = await res.json();
    if (!res.ok) return showError(account.error || "Could not open account.");

    document.getElementById("new-account-form").reset();
    activeId = account.id;
    await fetchAccounts();
  } catch {
    showError("Could not open account while offline. Connect to the server and try again.");
  }
});

// ---------- Deposit ----------
document.getElementById("deposit-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!activeId) return;
  clearError();
  const amount = document.getElementById("deposit-amount").value;

  let validAmount;
  try { validAmount = readAmount(amount, "Deposit"); } catch (error) { return showError(error.message); }

  try {
    const res = await fetch(`${API}/${activeId}/deposit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: validAmount }),
    });
    const data = await res.json();

    if (!res.ok) return showError(data.error);
    document.getElementById("deposit-form").reset();
    await fetchAccounts();
  } catch { showError("Deposit failed. Please check your connection."); }
});

// ---------- Withdraw ----------
document.getElementById("withdraw-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!activeId) return;
  clearError();
  const amount = document.getElementById("withdraw-amount").value;

  let validAmount;
  try { validAmount = readAmount(amount, "Withdrawal"); } catch (error) { return showError(error.message); }

  try {
    const res = await fetch(`${API}/${activeId}/withdraw`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: validAmount }),
    });
    const data = await res.json();

    if (!res.ok) return showError(data.error);
    document.getElementById("withdraw-form").reset();
    await fetchAccounts();
  } catch { showError("Withdrawal failed. Please check your connection."); }
});

fetchAccounts();
