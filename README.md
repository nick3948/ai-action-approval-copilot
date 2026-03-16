# AI Action Approval Copilot 🤖

**Secure AI agents with human-in-the-loop approval, powered by Auth0 Token Vault.** 

---

## Overview

AI Action Approval Copilot acts as a secure "middleman" between you and your AI agent. Rather than giving an AI unrestricted access to your API keys, this app pauses execution on any high-risk action (like posting to Slack or deleting a repo). 

It presents an **Agentic Pre-Flight Checklist** for your approval. If you say yes, it securely fetches a temporary, just-in-time token from the Auth0 Token Vault to complete the job.

> **Deep Dive Blog Post:** 
> I am writing a comprehensive blog post explaining the exact architecture, Risk-Based Authentication strategy, and how I built this using the new Auth0 Token Vault. 
> **[Read the Full Story on Devpost (Link Coming Soon) ➔](#)**

---

## 🛠️ Core Tech Stack
* **Frontend & API:** Next.js (App Router)
* **Authentication:** Auth0 for AI Agents Token Vault + `@auth0/nextjs-auth0` (v4)
* **AI Orchestration:** LangGraph 
* **AI Model:** OpenAI
* **Styling:** TailwindCSS

---

## 🚀 Quick Local Setup

### Prerequisites
* Node.js v20+
* A free [Auth0 Account](https://auth0.com/)

### Installation Steps

1. **Clone the repo:**
   ```bash
   git clone https://github.com/nick3948/ai-action-approval-copilot.git
   cd ai-action-approval-copilot
   npm install
   ```

2. **Configure Auth0:** 
   Create a "Regular Web Application" inside your [Auth0 Dashboard](https://manage.auth0.com/). Add `http://localhost:3000/auth/callback` to Allowed Callback URLs, and `http://localhost:3000` to Allowed Logout URLs.

3. **Set Environment Variables:**
   Create a `.env.local` file in the root directory and add your credentials:
   ```env
   AUTH0_SECRET='(generate using: openssl rand -hex 32)'
   APP_BASE_URL='http://localhost:3000'
   AUTH0_DOMAIN='your-tenant.us.auth0.com'
   AUTH0_CLIENT_ID='your_client_id_here'
   AUTH0_CLIENT_SECRET='your_client_secret_here'
   ```

4. **Run the App:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` to log in and test the copilot!
