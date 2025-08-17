import type { Context } from "hono";
import { setJWTCookie } from "../../middleware/auth.js";
import {
	exchangeCodeForToken,
	getDiscordOAuthURL,
	getDiscordUser,
	getUserGuilds,
	isServerMember,
} from "../../services/discord.js";
import { userRepository } from "../../services/user-repository.js";
import { logger } from "../../utils/logger.js";

const authLogger = logger.getSubLogger({ name: "auth.discord" });

const DISCORD_TARGET_SERVER_ID = process.env["DISCORD_TARGET_SERVER_ID"];
if (!DISCORD_TARGET_SERVER_ID) {
	throw new Error("DISCORD_TARGET_SERVER_ID environment variable is required");
}

export async function discordLogin(c: Context): Promise<Response> {
	try {
		const oauthUrl = getDiscordOAuthURL();
		authLogger.info("Discord OAuth login initiated");
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
		if (!code) {
			authLogger.warn("Discord callback missing authorization code");
			return c.json({ error: "Authorization code required" }, 400);
		}

		// Exchange code for access token
		const accessToken = await exchangeCodeForToken(code);

		// Get user profile
		const discordUser = await getDiscordUser(accessToken);

		// Get user guilds
		const guilds = await getUserGuilds(accessToken);

		// Verify server membership
		if (!isServerMember(guilds, DISCORD_TARGET_SERVER_ID!)) {
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

			// Redirect to dashboard (or wherever appropriate)
			return c.redirect("/");
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
