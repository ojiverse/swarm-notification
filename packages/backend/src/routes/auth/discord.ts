import type { Context } from "hono";
import { requireEnv } from "../../lib/env.js";
import { generateOAuthState, validateOAuthState } from "../../lib/oauth.js";
import { setJWTCookie } from "../../middleware/auth.js";
import { userRepository } from "../../repository/user.js";
import {
	exchangeCodeForToken,
	getDiscordOAuthURL,
	getDiscordUser,
	getUserGuilds,
	isServerMember,
} from "../../services/discord.js";
import { logger } from "../../utils/logger.js";

const authLogger = logger.getSubLogger({ name: "auth.discord" });
const DISCORD_TARGET_SERVER_ID = requireEnv("DISCORD_TARGET_SERVER_ID");

export async function discordLogin(c: Context): Promise<Response> {
	try {
		const state = generateOAuthState();
		const oauthUrl = getDiscordOAuthURL(state);
		authLogger.info("Discord OAuth login initiated", { state });
		return c.redirect(oauthUrl);
	} catch (error) {
		authLogger.error("Discord login error", {
			error: error instanceof Error ? error.message : "Unknown error",
		});
		return c.json({ error: "Failed to initiate Discord login" }, 500);
	}
}

export async function discordCallback(c: Context): Promise<Response> {
	try {
		const code = c.req.query("code");
		const state = c.req.query("state");

		if (!code) {
			authLogger.warn("Discord callback missing authorization code");
			return c.json({ error: "Authorization code required" }, 400);
		}

		if (!state) {
			authLogger.warn("Discord callback missing state parameter");
			return c.json({ error: "State parameter required" }, 400);
		}

		// Validate state to prevent CSRF attacks
		if (!validateOAuthState(state)) {
			authLogger.warn("Discord callback invalid state parameter", { state });
			return c.json({ error: "Invalid or expired state parameter" }, 400);
		}

		// Exchange code for access token
		const accessToken = await exchangeCodeForToken(code);

		// Get user profile
		const discordUser = await getDiscordUser(accessToken);

		// Get user guilds
		const guilds = await getUserGuilds(accessToken);

		// Verify server membership
		if (!isServerMember(guilds, DISCORD_TARGET_SERVER_ID)) {
			authLogger.warn("Discord user not member of target server", {
				discordUserId: discordUser.id,
				discordUsername: discordUser.username,
				targetServerId: DISCORD_TARGET_SERVER_ID,
			});
			return c.json(
				{ error: "You must be a member of the target Discord server" },
				403,
			);
		}

		// Create or update user record
		let user: Awaited<ReturnType<typeof userRepository.getUserByDiscordId>>;
		let isNewUser = false;
		try {
			user = await userRepository.getUserByDiscordId(discordUser.id);
			if (!user) {
				// Create new user
				user = await userRepository.createUser({
					discordUserId: discordUser.id,
					discordUsername: discordUser.username,
					...(discordUser.global_name && {
						discordDisplayName: discordUser.global_name,
					}),
				});
				isNewUser = true;
				authLogger.info("New Discord user created", {
					discordUserId: discordUser.id,
					discordUsername: discordUser.username,
				});
			} else {
				// Update existing user
				user = await userRepository.updateUser(discordUser.id, {
					discordUsername: discordUser.username,
					...(discordUser.global_name && {
						discordDisplayName: discordUser.global_name,
					}),
				});
				authLogger.info("Discord user updated", {
					discordUserId: discordUser.id,
					discordUsername: discordUser.username,
				});
			}
		} catch (error) {
			authLogger.error("Failed to create/update user", {
				error: error instanceof Error ? error.message : "Unknown error",
				discordUserId: discordUser.id,
			});
			return c.json({ error: "Failed to process user data" }, 500);
		}

		// Set JWT cookie
		try {
			await setJWTCookie(c, {
				discordUserId: discordUser.id,
				discordUsername: discordUser.username,
				serverMember: true,
			});

			authLogger.info("Discord authentication successful", {
				discordUserId: discordUser.id,
				discordUsername: discordUser.username,
			});

			// Seamless redirect to Swarm OAuth for new users or users without Swarm connection
			const hasSwarmConnection = !!user.foursquareUserId;
			if (isNewUser || !hasSwarmConnection) {
				authLogger.info("Redirecting to Swarm OAuth for seamless onboarding", {
					discordUserId: discordUser.id,
					isNewUser,
					hasSwarmConnection,
				});

				return c.html(`
					<html>
						<head>
							<meta http-equiv="refresh" content="3;url=/auth/swarm/login">
						</head>
						<body>
							<h1>Discord Connected Successfully! 🎉</h1>
							<p><strong>Welcome:</strong> ${discordUser.username}</p>
							${discordUser.global_name ? `<p><strong>Display Name:</strong> ${discordUser.global_name}</p>` : ""}
							<p><strong>Connected At:</strong> ${new Date().toLocaleString()}</p>
							
							<div style="background: #5865f2; color: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
								<h3>✅ Discord Authentication Complete</h3>
								<p>Now let's connect your Foursquare Swarm account to complete the setup!</p>
							</div>
							
							<p>Redirecting to Swarm connection in 3 seconds...</p>
							<p><a href="/auth/swarm/login">Connect Swarm Now →</a></p>
						</body>
					</html>
				`);
			}

			// Existing users with Swarm connection get a welcome back message
			return c.html(`
				<html>
					<head>
						<meta http-equiv="refresh" content="2;url=/users/@me">
					</head>
					<body>
						<h1>Welcome Back! 👋</h1>
						<p><strong>Discord User:</strong> ${discordUser.username}</p>
						${discordUser.global_name ? `<p><strong>Display Name:</strong> ${discordUser.global_name}</p>` : ""}
						
						<div style="background: #e7f5e7; padding: 15px; border-radius: 8px; margin: 20px 0;">
							<h3>✅ Already Set Up</h3>
							<p>Your Discord and Swarm accounts are already connected!</p>
						</div>
						
						<p>Redirecting to your profile in 2 seconds...</p>
						<p><a href="/users/@me">View Profile Now →</a></p>
					</body>
				</html>
			`);
		} catch (error) {
			authLogger.error("Failed to set JWT cookie", {
				error: error instanceof Error ? error.message : "Unknown error",
				discordUserId: discordUser.id,
			});
			return c.json({ error: "Authentication failed" }, 500);
		}
	} catch (error) {
		authLogger.error("Discord callback error", {
			error: error instanceof Error ? error.message : "Unknown error",
		});
		return c.json({ error: "Authentication failed" }, 500);
	}
}
