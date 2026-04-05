/**
 * Tool definitions for the AI agent.
 * Each tool has a name, description (for the LLM), schema (Zod), and risk_level.
 */

import { z } from "zod";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface ToolDefinition {
  name: string;
  description: string;
  schema: z.ZodObject<any>;
  risk_level: RiskLevel;
  scopes: string[];
}

export const TOOLS: ToolDefinition[] = [
  // ─── Read-only GitHub ─────────────────────────────────────────────────────
  {
    name: "list_github_repos",
    description: "List the authenticated user's GitHub repositories (owned and collaborator). Use when the user asks to see, show, or list their GitHub repos.",
    schema: z.object({}),
    risk_level: "low",
    scopes: ["repo:read"],
  },
  {
    name: "get_github_repo",
    description: "Get details about a specific GitHub repository: description, stars, forks, language, and URL.",
    schema: z.object({
      owner: z.string().describe("Repository owner (GitHub username or org)"),
      repo: z.string().describe("Repository name (without the owner/ prefix)"),
    }),
    risk_level: "low",
    scopes: ["repo:read"],
  },
  {
    name: "list_github_issues",
    description: "List issues in a GitHub repository. Use when the user asks to see open or closed issues/bugs/tickets.",
    schema: z.object({
      owner: z.string().describe("Repository owner"),
      repo: z.string().describe("Repository name"),
      state: z.enum(["open", "closed", "all"]).default("open").describe("Issue state to filter by"),
    }),
    risk_level: "low",
    scopes: ["repo:read"],
  },
  {
    name: "list_pull_requests",
    description: "List pull requests in a GitHub repository.",
    schema: z.object({
      owner: z.string().describe("Repository owner"),
      repo: z.string().describe("Repository name"),
      state: z.enum(["open", "closed", "all"]).default("open").describe("PR state to filter by"),
    }),
    risk_level: "low",
    scopes: ["repo:read"],
  },
  {
    name: "list_branches",
    description: "List all branches in a GitHub repository.",
    schema: z.object({
      owner: z.string().describe("Repository owner"),
      repo: z.string().describe("Repository name"),
    }),
    risk_level: "low",
    scopes: ["repo:read"],
  },

  // ─── Write GitHub ─────────────────────────────────────────────────────────
  {
    name: "create_github_issue",
    description: "Create a new issue in a GitHub repository.",
    schema: z.object({
      owner: z.string().describe("Repository owner"),
      repo: z.string().describe("Repository name"),
      title: z.string().describe("Issue title"),
      body: z.string().describe("Issue body / description"),
    }),
    risk_level: "medium",
    scopes: ["repo:write"],
  },
  {
    name: "close_github_issue",
    description: "Close an open issue in a GitHub repository.",
    schema: z.object({
      owner: z.string().describe("Repository owner"),
      repo: z.string().describe("Repository name"),
      issue_number: z.number().describe("The issue number to close"),
    }),
    risk_level: "medium",
    scopes: ["repo:write"],
  },
  {
    name: "create_pull_request",
    description: "Create a new pull request in a GitHub repository.",
    schema: z.object({
      owner: z.string().describe("Repository owner"),
      repo: z.string().describe("Repository name"),
      title: z.string().describe("PR title"),
      head: z.string().describe("The branch containing the changes (source branch)"),
      base: z.string().describe("The branch to merge into (target branch, e.g. 'main')"),
      body: z.string().describe("PR description"),
    }),
    risk_level: "medium",
    scopes: ["repo:write"],
  },
  {
    name: "create_branch",
    description: "Create a new branch in a GitHub repository from an existing branch.",
    schema: z.object({
      owner: z.string().describe("Repository owner"),
      repo: z.string().describe("Repository name"),
      branch: z.string().describe("Name of the new branch to create"),
      from_branch: z.string().default("main").describe("The base branch to create from (default: main)"),
    }),
    risk_level: "medium",
    scopes: ["repo:write"],
  },
  {
    name: "create_release",
    description: "Create a new GitHub release with a version tag and release notes.",
    schema: z.object({
      owner: z.string().describe("Repository owner"),
      repo: z.string().describe("Repository name"),
      tag: z.string().describe("Version tag (e.g. v1.0.0)"),
      name: z.string().describe("Release name/title"),
      body: z.string().describe("Release notes / changelog"),
    }),
    risk_level: "high",
    scopes: ["repo:write"],
  },

  // ─── Destructive GitHub ───────────────────────────────────────────────────
  {
    name: "merge_pull_request",
    description: "Merge an open pull request using squash merge.",
    schema: z.object({
      owner: z.string().describe("Repository owner"),
      repo: z.string().describe("Repository name"),
      pr_number: z.number().describe("The pull request number to merge"),
    }),
    risk_level: "high",
    scopes: ["repo:write"],
  },
  {
    name: "delete_github_repo",
    description: "Permanently delete a GitHub repository. This action is irreversible.",
    schema: z.object({
      owner: z.string().describe("Repository owner"),
      repo: z.string().describe("Repository name to delete"),
    }),
    risk_level: "critical",
    scopes: ["repo:delete"],
  },

  // ─── Slack ────────────────────────────────────────────────────────────────
  {
    name: "send_slack_message",
    description: "Send a message to a Slack channel or user.",
    schema: z.object({
      channel: z.string().describe("Slack channel name or user ID"),
      message: z.string().describe("The message to send"),
    }),
    risk_level: "low",
    scopes: ["chat:write"],
  },
];

export const TOOLS_MAP = Object.fromEntries(TOOLS.map((t) => [t.name, t]));
