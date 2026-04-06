/**
 * Minimal Slack API wrapper for Agent Tools.
 */

/**
 * Sends a message to a Slack channel
 */
export async function sendSlackMessage(token: string, channel: string, text: string): Promise<string> {
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      channel,
      text,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error || res.statusText || "Failed to send Slack message");
  }

  return `Successfully sent message to ${channel}. Message ID: ${data.ts}`;
}
