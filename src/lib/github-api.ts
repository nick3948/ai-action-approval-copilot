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

// ─── Releases ────────────────────────────────────────────────────────────────

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
