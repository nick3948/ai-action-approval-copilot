/**
 * Auth0 Management API helper
 *
 * Token lifecycle:
 *  - Auth0 M2M tokens expire in 86400s (24h) by default
 *  - We cache with a 5-minute proactive refresh window (token refreshed
 *    5 min before actual expiry, not just 60s) — safer for long sessions
 *  - Singleton promise guards against concurrent refreshes (thundering herd):
 *    if N requests arrive simultaneously with an expired token, only ONE
 *    HTTP call is made to Auth0; the rest await the same promise
 */

let mgmtTokenCache: { token: string; expiresAt: number } | null = null;
let mgmtTokenInflight: Promise<string> | null = null;

const REFRESH_BUFFER_MS = 5 * 60 * 1000; // refresh 5 min before actual expiry

async function fetchFreshToken(): Promise<string> {
  const res = await fetch(`https://${process.env.AUTH0_DOMAIN}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: process.env.AUTH0_CUSTOM_API_CLIENT_ID!,
      client_secret: process.env.AUTH0_CUSTOM_API_CLIENT_SECRET!,
      audience: `https://${process.env.AUTH0_DOMAIN}/api/v2/`,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || "Failed to get M2M token");

  mgmtTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000 - REFRESH_BUFFER_MS,
  };
  return data.access_token;
}

async function getManagementAPIToken(): Promise<string> {
  // Fast path: valid cached token, no network call needed
  if (mgmtTokenCache && Date.now() < mgmtTokenCache.expiresAt) {
    return mgmtTokenCache.token;
  }

  // Slow path: token missing or about to expire.
  // Deduplicate concurrent requests — if a fetch is already in-flight,
  // all callers share that same promise instead of each firing a new one.
  if (!mgmtTokenInflight) {
    mgmtTokenInflight = fetchFreshToken().finally(() => {
      mgmtTokenInflight = null;
    });
  }

  return mgmtTokenInflight;
}


/**
 * Fetches the Auth0 user profile with all linked identities.
 */
async function getUserProfile(auth0UserId: string) {
  const mgmtToken = await getManagementAPIToken();
  const res = await fetch(
    `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(auth0UserId)}`,
    { headers: { Authorization: `Bearer ${mgmtToken}` } }
  );
  const user = await res.json();
  if (!res.ok) throw new Error(user.message || "Failed to fetch user profile");
  return user;
}

/**
 * Returns the GitHub access token for a user.
 * Works whether GitHub is the primary login or a linked identity.
 */
export async function getGitHubToken(auth0UserId: string): Promise<string> {
  const user = await getUserProfile(auth0UserId);

  const githubIdentity = user.identities?.find((id: any) => id.provider === "github");
  if (!githubIdentity?.access_token) {
    throw new Error(
      "GitHub is not connected to your account. Click 'Connect GitHub' in the header to link it."
    );
  }

  return githubIdentity.access_token;
}

/**
 * Checks which services a user has connected.
 * Returns a map of provider → connected (bool).
 */
export async function getConnectedServices(auth0UserId: string): Promise<Record<string, boolean>> {
  const user = await getUserProfile(auth0UserId);
  const identities: any[] = user.identities ?? [];

  return {
    github: identities.some((id) => id.provider === "github"),
    slack: identities.some((id) => id.provider === "slack"),
    // jira: identities.some((id) => id.provider === "jira"),   // future
    // notion: identities.some((id) => id.provider === "notion"), // future
  };
}

/**
 * Extensible helper — add more providers here as you integrate them.
 *
 * Future usage:
 *   const slackToken = await getServiceToken(userId, "slack");
 *   const jiraToken  = await getServiceToken(userId, "atlassian");
 */
export async function getServiceToken(auth0UserId: string, provider: string): Promise<string> {
  const user = await getUserProfile(auth0UserId);
  const identity = user.identities?.find((id: any) => id.provider === provider);
  if (!identity?.access_token) {
    throw new Error(`${provider} is not connected. Please connect it from your account settings.`);
  }
  return identity.access_token;
}
