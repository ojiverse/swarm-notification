import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth.js";
import { userRepository } from "../../repository/user.js";
import type { AuthenticatedContext } from "../../types/auth.js";
import { logger } from "../../utils/logger.js";

const usersLogger = logger.getSubLogger({ name: "users" });

const app = new Hono<{ Variables: AuthenticatedContext }>();

// GET /users/@me - Returns current user information
app.get("/@me", requireAuth(), async (c) => {
	try {
		const user = c.get("user");
		const { discordUserId, discordUsername } = user;

		usersLogger.info("User info requested", {
			discordUserId,
			discordUsername,
		});

		// Get Foursquare user info from repository
		const foursquareUser =
			await userRepository.getUserByDiscordId(discordUserId);

		const response = {
			discord: {
				userId: discordUserId,
				username: discordUsername,
			},
			foursquare: foursquareUser?.foursquareUserId
				? {
						userId: foursquareUser.foursquareUserId,
					}
				: null,
		};

		usersLogger.info("User info retrieved successfully", {
			discordUserId,
			foursquareUserId: foursquareUser?.foursquareUserId || null,
			foursquareConnected: !!foursquareUser?.foursquareUserId,
		});

		return c.json(response);
	} catch (error) {
		usersLogger.error("Failed to retrieve user info", {
			error: error instanceof Error ? error.message : "Unknown error",
			discordUserId: c.get("user")?.discordUserId,
		});

		return c.json(
			{
				error: "Failed to retrieve user information",
			},
			500,
		);
	}
});

export default app;
