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
  // If the user hardcoded a token in .env.local, use it directly
  if (process.env.AUTH0_MANAGEMENT_API_TOKEN) {
    return process.env.AUTH0_MANAGEMENT_API_TOKEN.replace(/^["']/, '').replace(/["']$/, '');
  }

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
 * Fetches ALL user profiles that share the same email address as the current user.
 * This effectively acts as "implicit account linking" for our application without needing Auth0 Actions.
 */
async function getAllIdentitiesByEmail(auth0UserId: string) {
  const user = await getUserProfile(auth0UserId);
  if (!user.email) return user.identities ?? [];

  const mgmtToken = await getManagementAPIToken();
  const res = await fetch(
    `https://${process.env.AUTH0_DOMAIN}/api/v2/users-by-email?email=${encodeURIComponent(user.email)}`,
    { headers: { Authorization: `Bearer ${mgmtToken}` } }
  );

  if (!res.ok) return user.identities ?? [];
  const usersWithSameEmail = await res.json();

  const allIdentities: any[] = [];
  for (const u of usersWithSameEmail) {
    if (u.identities) allIdentities.push(...u.identities);
  }
  return allIdentities;
}

export async function linkAccountsInAuth0(primaryUserId: string, secondaryUserId: string) {
  const mgmtToken = await getManagementAPIToken();

  const provider = secondaryUserId.split('|')[0];
  const secondaryIdWithoutProvider = secondaryUserId.substring(provider.length + 1);

  console.log(`[linkAccountsInAuth0] Linking ${secondaryUserId} INTO ${primaryUserId}...`);

  const linkRes = await fetch(`https://${process.env.AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(primaryUserId)}/identities`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${mgmtToken}`
    },
    body: JSON.stringify({
      provider: provider,
      user_id: secondaryIdWithoutProvider
    })
  });

  if (!linkRes.ok) {
    const errorText = await linkRes.text();
    console.error(`[linkAccountsInAuth0] Failed to link accounts: ${errorText}`);
    throw new Error(`Auth0 Linking Failed: ${errorText}`);
  }

  console.log(`[linkAccountsInAuth0] Successfully linked!`);
}

export async function disconnectService(auth0UserId: string, targetProvider: string) {
  const mgmtToken = await getManagementAPIToken();
  const user = await getUserProfile(auth0UserId);
  const identities = user.identities ?? [];

  const identityToDrop = identities.find((id: any) => id.provider === targetProvider || id.connection?.includes(targetProvider) || id.provider?.includes(targetProvider));

  if (!identityToDrop) {
    throw new Error(`Cannot find connected identity for ${targetProvider}`);
  }

  const primaryId = encodeURIComponent(auth0UserId);
  const secondaryProvider = encodeURIComponent(identityToDrop.provider);
  const secondaryUserId = encodeURIComponent(identityToDrop.user_id);

  console.log(`[disconnectService] Dropping ${secondaryProvider}|${secondaryUserId} from ${primaryId}`);

  const res = await fetch(`https://${process.env.AUTH0_DOMAIN}/api/v2/users/${primaryId}/identities/${secondaryProvider}/${secondaryUserId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${mgmtToken}` }
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`[disconnectService] Failed: ${errorText}`);
    throw new Error(`Auth0 Disconnect Failed: ${errorText}`);
  }
}


/**
 * Returns the GitHub access token for a user.
 * Works whether GitHub is the primary login or a linked identity.
 */
export async function getGitHubToken(auth0UserId: string): Promise<string> {
  const identities = await getAllIdentitiesByEmail(auth0UserId);

  const githubIdentity = identities.find((id: any) => id.provider === "github");
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
  const identities: any[] = await getAllIdentitiesByEmail(auth0UserId);

  console.log(`[getConnectedServices] Checking user: ${auth0UserId}`);
  console.log(`[getConnectedServices] Unified identities found across email:`, JSON.stringify(identities, null, 2));

  return {
    github: identities.some((id) => id.provider === "github" || id.connection === "github"),
    slack: identities.some((id) => id.provider === "slack" || id.connection?.includes("slack") || id.provider?.includes("slack")),
    // jira: identities.some((id) => id.provider === "jira" || id.connection?.includes("jira")),  
    // notion: identities.some((id) => id.provider === "notion" || id.connection?.includes("notion")), 
  };
}

/**
 * Extensible helper — add more providers here as you integrate them.
 *
 * Future usage:
 *   const jiraToken  = await getServiceToken(userId, "atlassian");
 */
export async function getServiceToken(auth0UserId: string, provider: string): Promise<string> {
  const identities = await getAllIdentitiesByEmail(auth0UserId);
  const identity = identities.find((id: any) => id.provider === provider || id.connection?.includes(provider) || id.provider?.includes(provider));
  if (!identity?.access_token) {
    throw new Error(`${provider} is not connected. Please connect it from your account settings.`);
  }
  return identity.access_token;
}

/**
 * Gets the actual display name from the connected Slack profile inside Auth0,
 * specifically bypassing the root session email identity.
 */
export async function getSlackProfileName(auth0UserId: string): Promise<string | null> {
  try {
    const identities = await getAllIdentitiesByEmail(auth0UserId);
    const slackIdentity = identities.find((id: any) => id.provider === "slack" || id.connection?.includes("slack") || id.provider?.includes("slack"));
    
    if (slackIdentity?.profileData?.name) {
      return slackIdentity.profileData.name;
    }
  } catch(e) {
    console.error("[getSlackProfileName] Error fetching identity", e);
  }
  return null;
}

