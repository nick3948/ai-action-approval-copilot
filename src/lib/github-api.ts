/**
 * GitHub API helpers
 * Clean, typed wrappers around the GitHub REST API.
 * All functions accept a `token` — obtained securely from Auth0.
 */

const GH_BASE = "https://api.github.com";

function ghHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function ghFetch(token: string, path: string, options: RequestInit = {}) {
  const res = await fetch(`${GH_BASE}${path}`, {
    ...options,
    headers: ghHeaders(token),
  });

  if (res.status === 204) return null; // No Content (e.g. delete)

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || JSON.stringify(data));
  return data;
}

// ─── Repositories ────────────────────────────────────────────────────────────

export async function listRepos(token: string) {
  const data = await ghFetch(token, "/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator");
  return (data as any[]).map((r) => ({
    name: r.full_name,
    private: r.private,
    description: r.description,
    stars: r.stargazers_count,
    language: r.language,
    url: r.html_url,
  }));
}

export async function deleteRepo(token: string, owner: string, repo: string) {
  await ghFetch(token, `/repos/${owner}/${repo}`, { method: "DELETE" });
  return `Repository "${owner}/${repo}" permanently deleted.`;
}

export async function createRepo(
  token: string,
  name: string,
  description: string,
  isPrivate: boolean
) {
  const data = await ghFetch(token, "/user/repos", {
    method: "POST",
    body: JSON.stringify({
      name,
      description,
      private: isPrivate,
      auto_init: true,
    }),
  });
  return `Repository "${data.full_name}" created successfully!\nURL: ${data.html_url}\nVisibility: ${data.private ? "Private 🔒" : "Public 🌐"}`;
}


export async function getRepo(token: string, owner: string, repo: string) {
  const r = await ghFetch(token, `/repos/${owner}/${repo}`);
  return `${r.full_name}: ${r.description || "No description"}\nStars: ${r.stargazers_count} | Forks: ${r.forks_count} | Language: ${r.language || "N/A"}\nURL: ${r.html_url}`;
}

// ─── Issues ──────────────────────────────────────────────────────────────────

export async function listIssues(token: string, owner: string, repo: string, state = "open") {
  const data: any[] = await ghFetch(token, `/repos/${owner}/${repo}/issues?state=${state}&per_page=30`);
  const issues = data.filter((i) => !i.pull_request); // exclude PRs
  if (issues.length === 0) return `No ${state} issues in ${owner}/${repo}.`;
  return issues.map((i) => `#${i.number} [${i.state}] ${i.title} — ${i.html_url}`).join("\n");
}

export async function createIssue(token: string, owner: string, repo: string, title: string, body: string) {
  const data = await ghFetch(token, `/repos/${owner}/${repo}/issues`, {
    method: "POST",
    body: JSON.stringify({ title, body }),
  });
  return `Issue #${data.number} created: "${data.title}"\n${data.html_url}`;
}

export async function closeIssue(token: string, owner: string, repo: string, issue_number: number) {
  const data = await ghFetch(token, `/repos/${owner}/${repo}/issues/${issue_number}`, {
    method: "PATCH",
    body: JSON.stringify({ state: "closed" }),
  });
  return `Issue #${data.number} "${data.title}" is now closed.`;
}

// ─── Pull Requests ────────────────────────────────────────────────────────────

export async function listPullRequests(token: string, owner: string, repo: string, state = "open") {
  const data: any[] = await ghFetch(token, `/repos/${owner}/${repo}/pulls?state=${state}&per_page=20`);
  if (data.length === 0) return `No ${state} pull requests in ${owner}/${repo}.`;
  return data.map((pr) => `#${pr.number} [${pr.state}] ${pr.title} (${pr.head.ref} → ${pr.base.ref}) — ${pr.html_url}`).join("\n");
}

export async function createPullRequest(
  token: string, owner: string, repo: string,
  title: string, head: string, base: string, body: string
) {
  const data = await ghFetch(token, `/repos/${owner}/${repo}/pulls`, {
    method: "POST",
    body: JSON.stringify({ title, head, base, body }),
  });
  return `PR #${data.number} created: "${data.title}"\n${data.html_url}`;
}

export async function mergePullRequest(token: string, owner: string, repo: string, pr_number: number) {
  const data = await ghFetch(token, `/repos/${owner}/${repo}/pulls/${pr_number}/merge`, {
    method: "PUT",
    body: JSON.stringify({ merge_method: "squash" }),
  });
  return data?.merged ? `PR #${pr_number} merged successfully! SHA: ${data.sha}` : "Merge failed.";
}

// ─── Branches ────────────────────────────────────────────────────────────────

export async function listBranches(token: string, owner: string, repo: string) {
  const data: any[] = await ghFetch(token, `/repos/${owner}/${repo}/branches`);
  return data.map((b) => `• ${b.name}${b.protected ? " 🔒" : ""}`).join("\n");
}

export async function createBranch(token: string, owner: string, repo: string, branch: string, from_branch = "main") {
  // Get the SHA of the source branch
  const refData = await ghFetch(token, `/repos/${owner}/${repo}/git/ref/heads/${from_branch}`);
  const sha = refData.object.sha;
  await ghFetch(token, `/repos/${owner}/${repo}/git/refs`, {
    method: "POST",
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha }),
  });
  return `Branch "${branch}" created from "${from_branch}" in ${owner}/${repo}.`;
}

// ─── Developer Queue ─────────────────────────────────────────────────────────

export async function getMyQueue(token: string) {
  // GitHub Search API supports @me for authenticated user across all repos
  const [prs, reviews, issues] = await Promise.all([
    ghFetch(token, "/search/issues?q=is:pr+is:open+author:@me&sort=updated&per_page=10"),
    ghFetch(token, "/search/issues?q=is:pr+is:open+review-requested:@me&sort=updated&per_page=10"),
    ghFetch(token, "/search/issues?q=is:issue+is:open+assignee:@me&sort=updated&per_page=10"),
  ]);

  const fmt = (item: any) => `• [#${item.number}] ${item.title}\n  ${item.html_url}`;

  const sections: string[] = [];
  if (prs.items.length) sections.push(`### 🔀 Your Open Pull Requests (${prs.items.length})\n${prs.items.map(fmt).join("\n")}`);
  if (reviews.items.length) sections.push(`### 👀 PRs Awaiting Your Review (${reviews.items.length})\n${reviews.items.map(fmt).join("\n")}`);
  if (issues.items.length) sections.push(`### 🐛 Issues Assigned to You (${issues.items.length})\n${issues.items.map(fmt).join("\n")}`);

  return sections.length ? sections.join("\n\n") : "🎉 Your queue is clear! No open PRs or assigned issues.";
}

// ─── AI Code Review ──────────────────────────────────────────────────────────

export async function getPRForReview(token: string, owner: string, repo: string, pr_number: number) {
  const [pr, files] = await Promise.all([
    ghFetch(token, `/repos/${owner}/${repo}/pulls/${pr_number}`),
    ghFetch(token, `/repos/${owner}/${repo}/pulls/${pr_number}/files?per_page=20`),
  ]);

  const fileDiffs = (files as any[]).slice(0, 15).map((f: any) => {
    const patch = f.patch ? f.patch.slice(0, 2000) : "(binary or too large to show)";
    return `#### \`${f.filename}\` (+${f.additions} / -${f.deletions})\n\`\`\`diff\n${patch}\n\`\`\``;
  }).join("\n\n");

  return [
    `## PR #${pr_number}: ${pr.title}`,
    `**Author:** ${pr.user.login} | **Branch:** \`${pr.head.ref}\` → \`${pr.base.ref}\``,
    `**Stats:** +${pr.additions} additions, -${pr.deletions} deletions across ${pr.changed_files} file(s)`,
    `**Description:** ${pr.body || "_No description provided._"}`,
    `\n---\n### Changed Files\n`,
    fileDiffs,
    `\n---`,
    `*Now perform a thorough code review: identify bugs, security issues, performance concerns, and suggest improvements. Be concise but specific.*`,
  ].join("\n");
}

// ─── Comments ────────────────────────────────────────────────────────────────

export async function addComment(token: string, owner: string, repo: string, issue_number: number, body: string) {
  // This endpoint works for both Issues and Pull Requests
  const data = await ghFetch(token, `/repos/${owner}/${repo}/issues/${issue_number}/comments`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
  return `Comment posted on #${issue_number} in ${owner}/${repo}.\n${data.html_url}`;
}


export async function createRelease(
  token: string, owner: string, repo: string,
  tag: string, name: string, body: string
) {
  const data = await ghFetch(token, `/repos/${owner}/${repo}/releases`, {
    method: "POST",
    body: JSON.stringify({ tag_name: tag, name, body, draft: false, prerelease: false }),
  });
  return `Release "${data.name}" (${data.tag_name}) created!\n${data.html_url}`;
}
