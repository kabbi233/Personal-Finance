# Cash Flow Planner — Teller.io Integration

## Files
- `server.js` — Express backend (mTLS proxy to Teller API)
- `cashflow-planner.jsx` — React frontend
- `railway.json` — Railway deploy config
- `package.json` — Node dependencies

---

## Deploy Instructions

### Step 1 — Push to GitHub
1. Create a new private repo on GitHub
2. Drop all these files in (do NOT include your .pem files)
3. Push to main

### Step 2 — Deploy backend to Railway
1. Go to railway.app → New Project → Deploy from GitHub
2. Select your repo
3. Go to your project → Variables tab → add these 3 variables:

```
TELLER_CERT        → paste full contents of certificate.pem
TELLER_PRIVATE_KEY → paste full contents of private_key.pem
TELLER_APP_ID      → app_pq1oddda2fceiqaqk6000
```

4. Railway will build and give you a public URL like:
   `https://teller-cashflow-backend-production.up.railway.app`

### Step 3 — Update the frontend
In `cashflow-planner.jsx`, line 6, replace:
```js
const BACKEND_URL = "https://YOUR-RAILWAY-URL.railway.app";
```
with your actual Railway URL.

### Step 4 — Use the planner
- Open the planner artifact in Claude
- Click "Connect Bank"
- Log into your bank through Teller Connect
- Transactions will appear in the Transactions tab
- This month's actual vs projected shows at the top

---

## Notes
- Uses Teller sandbox environment by default
- To switch to production, change `environment: "sandbox"` to `environment: "production"` in cashflow-planner.jsx
- The backend auto-categorizes transactions into your planner's categories
- Add custom category keywords in `mapCategory()` in server.js
