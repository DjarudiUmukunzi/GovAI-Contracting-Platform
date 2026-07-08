/**
 * MCP server config for whichever mail/calendar/drive stack the user connects.
 *
 * MAIL_PROVIDER=google    -> Gmail MCP, Google Calendar MCP, Google Drive MCP
 * MAIL_PROVIDER=microsoft -> Outlook Mail MCP, Outlook Calendar MCP, OneDrive MCP
 *                            (via Microsoft Graph API OAuth)
 *
 * Both branches return the same shape so the rest of the app (drafting
 * sessions, deadline sync, past-performance retrieval) doesn't need to know
 * which provider is active. Only lib/ai-provider.ts's mcpServers argument
 * consumes this, and only when AI_PROVIDER=anthropic.
 */

type MCPServerConfig = {
  type: "url";
  url: string;
  name: string;
};

export function getMCPServers(): MCPServerConfig[] {
  const provider = process.env.MAIL_PROVIDER ?? "google";

  if (provider === "microsoft") {
    if (!process.env.OUTLOOK_MCP_URL) {
      throw new Error(
        "MAIL_PROVIDER=microsoft but OUTLOOK_MCP_URL is not set. " +
          "You'll need an Outlook/Graph MCP server (self-hosted or third-party) " +
          "since there is no first-party Anthropic-hosted one yet — verify current " +
          "options before committing to a specific provider."
      );
    }
    return [
      { type: "url", url: process.env.OUTLOOK_MCP_URL, name: "outlook-mail" },
      // If you split calendar/drive into separate MCP servers, add them here.
    ];
  }

  // default: google
  if (!process.env.GOOGLE_MCP_URL) {
    throw new Error("MAIL_PROVIDER=google but GOOGLE_MCP_URL is not set.");
  }
  return [{ type: "url", url: process.env.GOOGLE_MCP_URL, name: "gmail" }];
}

export function oauthConfigFor(provider: "google" | "microsoft") {
  if (provider === "microsoft") {
    return {
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      tenantId: process.env.MICROSOFT_TENANT_ID,
      scopes: ["Mail.ReadWrite", "Mail.Send", "Calendars.ReadWrite", "Files.ReadWrite"],
      authorizeUrl: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize`,
    };
  }
  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    scopes: [
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/drive",
    ],
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  };
}
