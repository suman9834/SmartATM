# SmartATM

SmartATM is a full-stack bank account management app built with Node.js, Express, and vanilla HTML/CSS/JavaScript.

## 🌐 Live Demo

[Open SmartATM](YOUR-RENDER-URL)

## Features

- Create and switch between multiple accounts
- Deposit and withdraw money with validation
- Rejects empty, non-numeric, zero, and negative amounts
- Prevents withdrawals above the current balance
- Transaction summary for deposits, withdrawals, and transaction count
- Export the active account statement as CSV
- Close an account with confirmation
- Account data persists in `backend/accounts.json`
- LocalStorage cache for browser refresh and offline viewing
- Responsive layout for desktop and mobile

## Run Locally

From the project root:

```bash
cd backend
npm install
npm start
```

Open <http://localhost:5000>. The Express server serves both the API and the frontend.

## API

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/accounts` | List all accounts |
| `POST` | `/api/accounts` | Create an account |
| `GET` | `/api/accounts/:id` | Get one account |
| `POST` | `/api/accounts/:id/deposit` | Deposit money |
| `POST` | `/api/accounts/:id/withdraw` | Withdraw money |
| `DELETE` | `/api/accounts/:id` | Close an account |

## Deploy on Render

1. Push this project to GitHub. Keep `backend/accounts.json` out of Git because it contains local account data.
2. In Render, choose **New > Blueprint** and select the GitHub repository.
3. Render detects `render.yaml` and creates the `smartatm` web service.
4. Wait for the build and deployment to finish.
5. Open the generated `https://smartatm-xxxx.onrender.com` URL.

The service uses Render's `PORT` environment variable and serves the frontend and API from the same URL.

> Note: Render's local filesystem is not permanent. For production-grade persistence, replace `accounts.json` with a managed database.
