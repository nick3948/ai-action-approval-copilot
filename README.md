# AI Action Approval Copilot

The **AI Action Approval Copilot** is a highly secure, developer-focused AI assistant that brings your external developer workflows (like GitHub and Slack) directly into a unified chat interface. It acts as an autonomous agent that can fetch PRs, summarize issues, and perform complex development workflows, all while adhering to a strict **Human-in-the-Loop** security model to ensure an LLM never performs unauthorized destructive actions.

## 1. Motto and Vision
*“Automate the tedious. Secure the critical.”*

The goal of this project is to eliminate context switching. Developers spend too much time navigating between chat apps, project management boards, and Git UI consoles. This copilot aims to act as a senior developer peer that can both provide architectural advice and instantly execute grunt work (like creating repositories, cutting releases, and notifying Slack channels) upon your explicit approval.

## 2. Tech Stack
This application is built with modern, cutting-edge web and AI technologies:

* **Frontend**: Next.js 14 (App Router), React, Tailwind CSS, Lucide Icons, React Joyride (Onboarding).
* **AI & Agent Logic**: LangGraph, LangChain, OpenAI (`gpt-4o-mini`).
* **Authentication & Identity**: Auth0 Identity Provider, Auth0 Token Vault (for managing multi-OAuth access tokens).
* **Database & Persistence**: Neon Serverless PostgreSQL, LangGraph Postgres Checkpointer.
* **Integrations Native**: GitHub API (Octokit), Slack API.

## 3. How does the Flow work?
1. **Authentication**: Users securely log into the application using Auth0.
2. **Integration Linking**: Users navigate to the "Integrations" dashboard and explicitly OAuth connect their Slack or GitHub accounts. These identities are securely merged into their main Auth0 profile via the Auth0 Management API.
3. **Agentic Invocation**: A user prompts the AI (e.g., *"Create a fast API repo"*). The prompt is sent to the backend `LangGraph` agent.
4. **Tool Selection**: The LLM figures out that `create_github_repo` is the perfect tool for the job. 
5. **Human-in-the-Loop Interruption**: Instead of blindly executing, LangGraph pauses execution (`interruptBefore`). The frontend detects a pending action and renders a clean Approval Card.
6. **Execution**: Once the user explicitly clicks "Approve", the server resumes the `LangGraph` execution, pulls the user's secret GitHub token securely from Auth0, performs the action, and logs it in the database.

## 4. Why this Architecture?
* **LangGraph + Postgres**: Because the agent relies on LangGraph, making complex API chains (e.g., getting the diff of a PR, feeding it to an LLM for review, then adding a comment) is easy. Using a Postgres Checkpointer means that complex agent logic and chat history are suspended securely in the cloud. You can start a conversation on your laptop, and resume it whenever you log in. 
* **Auth0 Token Vault**: Managing rolling external OAuth access tokens (like Slack or GitHub) is notoriously dangerous to build from scratch. Using Auth0's native identity linking mechanism, we keep API keys completely out of local storage and safely manage refreshes.
* **Four-Tier Risk Model**: Rather than treating every action the same, actions are assigned risk levels. Viewing a repo is low risk, while deleting a repository triggers a **Critical** flag, seamlessly forcing Auth0 Step-up Authentication (Re-login) before execution.

## 5. Features You Can Use Right Now
* **Developer Mentorship & Chat**: The Copilot isn't just an API runner, you can chat natively with the AI for architectural advice, debugging, and general software engineering inquiries.
* **GitHub Operations**: List repos, list issues, pull request summaries, create repos, open PRs, cut releases, create branches, review PRs, and delete repositories.
* **Slack Integration**: Send channel broadcasts on behalf of the developer.
* **Persistent Sessions**: Infinite memory across active chat threads.
* **Security Guardrails**: Visually distinct approval interfaces, ensuring what you prompt is what you get.

## 6. How to Clone and Run Locally

### Prerequisites
To run this project locally, you will need:
- Node.js (v18+)
- An OpenAI API Key
- A free Auth0 Tenant account
- A free Neon PostgreSQL account
- Pre-configured Auth0 Applications (M2M applications for the Auth0 Management API, and standard Web App for Login).

### Step-by-Step Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/nick3948/ai-action-approval-copilot.git
   cd ai-action-approval-copilot
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the root directory and populate it with your respective keys:
   ```env
   # Auth0 Core Config
   AUTH0_SECRET='your-randomly-generated-32-byte-secret'
   AUTH0_BASE_URL='http://localhost:3000'
   AUTH0_ISSUER_BASE_URL='https://your-tenant.us.auth0.com'
   AUTH0_CLIENT_ID='your-auth0-client-id'
   AUTH0_CLIENT_SECRET='your-auth0-client-secret'

   # Auth0 Management Node API
   AUTH0_MANAGEMENT_DOMAIN='your-tenant.us.auth0.com'
   AUTH0_MANAGEMENT_CLIENT_ID='your-m2m-client-id'
   AUTH0_MANAGEMENT_CLIENT_SECRET='your-m2m-client-secret'

   # AI Configuration
   OPENAI_API_KEY='sk-your-openai-key'
   GPT_MODEL='gpt-4o-mini'

   # Database Persistence
   DATABASE_URL='postgresql://user:pass@ep-cool-db.provider.com/neondb?sslmode=require'
   ```

4. **Launch the Application**
   ```bash
   npm run dev
   ```
   The application will spin up at `http://localhost:3000`. 
   
*Note: Because the database utilizes the automated LangGraph Postges Checkpointer and our custom db initialization script, **no manual database schema creation is required**. Simply plug in an empty Postgres Database URL, and the tables will provision themselves on boot.*

---

*This application was engineered with a heavy focus on architectural elegance, UI/UX polish, and an unwavering commitment to operational security.*
