# AI Action Approval Copilot 🤖

**Secure AI agents with human-in-the-loop approval and extensible multi-service integrations.**

## Overview

AI Action Approval Copilot acts as a secure "middleman" between you and your AI agent. Rather than giving an AI unrestricted access to your API keys, this app securely holds your integrated service tokens and pauses any execution requested by the AI. It presents an **Agentic Pre-Flight Checklist** for your approval. If you say yes, it executes the action using tokens fetched securely on demand.

## 🚀 Major Features Implemented

* **Human-in-the-Loop Action Approval:** A LangGraph orchestration system that intelligently decides when to use tools, classifies action risk (Low, Medium, High, Critical), and immediately pauses the graph to get your explicit UI-based approval before executing anything.
* **Multi-Service Account Linking (Auth0 Management API):** Users login via a primary method (like Email/Password) and can independently connect and link third-party services (like GitHub) under the single Auth0 identity. Tokens are stored securely as IDP access tokens.
* **12 Fully Supported GitHub Actions:**
  * **Read-only (Low Risk):** List repositories, get specific repo details, list open/closed issues, list Pull Requests, list branches. 
  * **Write (Medium to High Risk):** Create issues, close issues, create pull requests, create branches, merge pull requests, create releases.
  * **Destructive (Critical Risk):** Delete repositories.
* **Smart UI & Integrations Hub:** A beautiful dark-mode supported Chat Interface with independent conversation histories (saved atomically in caching memory) and an Integrations page clearly indicating which third-party services are currently communicating with your account.
* **Extensible Architecture:** Designed with future growth in mind. Adding Slack, Jira, or Notion integration in the future only requires 3 steps using the already-built generic `getServiceToken()` methodology.

## 🛠️ Core Tech Stack

* **Frontend & API:** Next.js (App Router)
* **Authentication:** Auth0 (Web Login + Management API + Multi-identity linking)
* **AI Orchestration:** LangGraph
* **AI Model:** OpenAI (`gpt-4o-mini`)
* **Styling:** TailwindCSS

---

> **Deep Dive Blog Post:** 
> I am writing a comprehensive blog post explaining the exact architecture, Risk-Based Authentication strategy, and how I built this securely. 
> **[Read the Full Story on Devpost (Link Coming Soon) ➔](#)**
