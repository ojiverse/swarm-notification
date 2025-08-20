import { Timestamp } from "@google-cloud/firestore";
import { Hono } from "hono";
import { generateOAuthState, validateOAuthState } from "../../lib/oauth.js";
import { requireAuth } from "../../middleware/auth.js";
import { userRepository } from "../../repository/user.js";
import {
	exchangeCodeForToken,
	getUserInfo,
} from "../../services/foursquare.js";
import { logger } from "../../utils/logger.js";

const swarmAuthRouter = new Hono();
const swarmLogger = logger.getSubLogger({ name: "auth.swarm" });

// Protected route - requires JWT authentication
swarmAuthRouter.get("/login", requireAuth(), (c) => {
	try {
		const clientId = process.env["FOURSQUARE_CLIENT_ID"];
		const baseDomain = process.env["BASE_DOMAIN"];

		if (!clientId || !baseDomain) {
			swarmLogger.error(
				"Missing OAuth configuration (FOURSQUARE_CLIENT_ID, BASE_DOMAIN)",
			);
			return c.json({ error: "OAuth configuration missing" }, 500);
		}

		const redirectUri = `${baseDomain}/auth/swarm/callback`;
		const state = generateOAuthState();

		const user = c.get("user");
		swarmLogger.info("Swarm OAuth initiated", {
			discordUserId: user.discordUserId,
			discordUsername: user.discordUsername,
			state,
		});

		const authUrl = new URL("https://foursquare.com/oauth2/authenticate");
		authUrl.searchParams.set("client_id", clientId);
		authUrl.searchParams.set("response_type", "code");
		authUrl.searchParams.set("redirect_uri", redirectUri);
		authUrl.searchParams.set("state", state);

		return c.redirect(authUrl.toString());
	} catch (error) {
		swarmLogger.error("Swarm login error", {
			error: error instanceof Error ? error.message : "Unknown error",
		});
		return c.json({ error: "Failed to initiate Swarm login" }, 500);
	}
});

// Protected route - requires JWT authentication
swarmAuthRouter.get("/callback", requireAuth(), async (c) => {
	const code = c.req.query("code");
	const state = c.req.query("state");
	const error = c.req.query("error");

	if (error) {
		return c.html(`
      <html>
        <body>
          <h1>Authentication Error</h1>
          <p>Error: ${error}</p>
          <a href="/auth/swarm/login">Try Again</a>
        </body>
      </html>
    `);
	}

	if (!code) {
		return c.html(`
      <html>
        <body>
          <h1>Missing Authorization Code</h1>
          <p>No authorization code received from Foursquare</p>
          <a href="/auth/swarm/login">Try Again</a>
        </body>
      </html>
    `);
	}

	if (!state) {
		swarmLogger.warn("Swarm callback missing state parameter", {
			discordUserId: c.get("user")?.discordUserId,
		});
		return c.html(`
      <html>
        <body>
          <h1>Security Error</h1>
          <p>State parameter missing. Please try again.</p>
          <a href="/auth/swarm/login">Try Again</a>
        </body>
      </html>
    `);
	}

	// Validate state to prevent CSRF attacks
	if (!validateOAuthState(state)) {
		swarmLogger.warn("Swarm callback invalid state parameter", {
			state,
			discordUserId: c.get("user")?.discordUserId,
		});
		return c.html(`
      <html>
        <body>
          <h1>Security Error</h1>
          <p>Invalid or expired state parameter. Please try again.</p>
          <a href="/auth/swarm/login">Try Again</a>
        </body>
      </html>
    `);
	}

	try {
		const user = c.get("user");
		const tokenResponse = await exchangeCodeForToken(code);
		const userInfo = await getUserInfo(tokenResponse.access_token);

		// Update user with Foursquare credentials
		try {
			await userRepository.updateUser(user.discordUserId, {
				foursquareUserId: userInfo.id,
				connectedAt: Timestamp.now(),
			});

			swarmLogger.info("Swarm OAuth successful", {
				discordUserId: user.discordUserId,
				discordUsername: user.discordUsername,
				foursquareUserId: userInfo.id,
				foursquareName: `${userInfo.firstName} ${userInfo.lastName || ""}`,
			});

			return c.html(`
        <html>
          <body>
            <h1>Swarm Connected Successfully! 🎉</h1>
            <p><strong>Discord User:</strong> ${user.discordUsername}</p>
            <p><strong>Foursquare User:</strong> ${userInfo.firstName} ${userInfo.lastName || ""}</p>
            <p><strong>Connected At:</strong> ${new Date().toLocaleString()}</p>
            
            <div style="background: #e7f5e7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3>✅ Setup Complete</h3>
              <p>Your Discord account is now connected to Foursquare Swarm!</p>
              <p>Check-ins will automatically appear in the Discord channel.</p>
            </div>
            
            <p><a href="/">← Back to Dashboard</a></p>
          </body>
        </html>
      `);
		} catch (dbError) {
			swarmLogger.error("Failed to save Swarm credentials", {
				error: dbError instanceof Error ? dbError.message : "Unknown error",
				discordUserId: user.discordUserId,
				foursquareUserId: userInfo.id,
			});
			return c.html(`
        <html>
          <body>
            <h1>Connection Error</h1>
            <p>Failed to save your Swarm connection. Please try again.</p>
            <p><a href="/auth/swarm/login">Try Again</a></p>
          </body>
        </html>
      `);
		}
	} catch (error) {
		swarmLogger.error("Swarm OAuth error", {
			error: error instanceof Error ? error.message : "Unknown error",
			discordUserId: c.get("user")?.discordUserId,
		});
		const errorMessage =
			process.env["NODE_ENV"] === "production"
				? "Authentication failed. Please try again."
				: `Failed to exchange code for token: ${(error as Error).message}`;

		return c.html(`
      <html>
        <body>
          <h1>Token Exchange Error</h1>
          <p>${errorMessage}</p>
          <a href="/auth/swarm/login">Try Again</a>
        </body>
      </html>
    `);
	}
});

export default swarmAuthRouter;
