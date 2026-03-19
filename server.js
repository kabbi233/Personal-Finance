const express = require("express");
const https = require("https");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Load certs from environment variables
const tlsAgent = new https.Agent({
  cert: process.env.TELLER_CERT,
  key: process.env.TELLER_PRIVATE_KEY,
});

const TELLER_BASE = "https://api.teller.io";

function tellerAuth(accessToken) {
  return "Basic " + Buffer.from(accessToken + ":").toString("base64");
}

async function tellerFetch(path, accessToken) {
  const res = await fetch(`${TELLER_BASE}${path}`, {
    agent: tlsAgent,
    headers: { Authorization: tellerAuth(accessToken) },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Teller error ${res.status}: ${err}`);
  }
  return res.json();
}

// GET /accounts — list all accounts for this enrollment
app.get("/accounts", async (req, res) => {
  try {
    const { accessToken } = req.query;
    if (!accessToken) return res.status(400).json({ error: "accessToken required" });
    const data = await tellerFetch("/accounts", accessToken);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /transactions — fetch + auto-categorize transactions across all accounts
app.get("/transactions", async (req, res) => {
  try {
    const { accessToken } = req.query;
    if (!accessToken) return res.status(400).json({ error: "accessToken required" });

    const accounts = await tellerFetch("/accounts", accessToken);

    const allTx = [];
    for (const acct of accounts) {
      try {
        const txs = await tellerFetch(`/accounts/${acct.id}/transactions`, accessToken);
        for (const tx of txs) {
          allTx.push({
            id: tx.id,
            date: tx.date,
            description: tx.description,
            amount: parseFloat(tx.amount),
            type: parseFloat(tx.amount) > 0 ? "income" : "expense",
            category: mapCategory(tx.details?.category, parseFloat(tx.amount), tx.description),
            accountName: acct.name,
            accountId: acct.id,
            status: tx.status,
          });
        }
      } catch (_) {
        // skip accounts that error (e.g. investment accounts)
      }
    }

    // Sort newest first
    allTx.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(allTx);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Health check
app.get("/health", (_, res) => res.json({ ok: true }));

// Map Teller categories → planner categories
function mapCategory(tellerCategory, amount, description) {
  const desc = (description || "").toLowerCase();
  const cat = (tellerCategory || "").toLowerCase();

  if (amount > 0) {
    if (desc.includes("ivory") || desc.includes("cleaning")) return "Ivory Maids";
    if (desc.includes("detail")) return "Detailing";
    if (desc.includes("payroll") || cat === "income") return "W-2 Job";
    return "Other Income";
  } else {
    if (cat === "advertising") return "Marketing";
    if (cat === "office_supplies" || cat === "supplies") return "Supplies";
    if (cat === "software" || cat === "subscription") return "Software";
    if (cat === "rent" || cat === "utilities") return "Rent/Utilities";
    if (cat === "tax") return "Taxes";
    if (cat === "payroll") return "Payroll";
    return "Personal";
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Teller proxy running on port ${PORT}`));
