import { Hono } from "hono";
import { loadDebugConfig } from "../../config.js";
import { userRepository } from "../../services/user-repository.js";
import {
	handleCheckinWebhook,
	validateWebhookPayload,
} from "../../services/webhook.js";
import { logger } from "../../utils/logger.js";

const router = new Hono();
const config = loadDebugConfig();

router.get("/health", async (c) => {
	try {
		// Check BASE_DOMAIN configuration
		const baseDomain = process.env["BASE_DOMAIN"];
		const baseDomainStatus = baseDomain ? "configured" : "missing";

		// Check Firestore connection
		let firestoreStatus = "unknown";
		const connectedUsersCount = 0;
		try {
			// Simple query to test Firestore connection
			await userRepository.getUserByDiscordId("health-check");
			firestoreStatus = "connected";

			// Count connected users (users with foursquareUserId)
			// This is optional and for admin visibility
			// In a real implementation, you might want to cache this
		} catch (error) {
			firestoreStatus = "error";
			logger.warn("Firestore health check failed", {
				error: error instanceof Error ? error.message : "Unknown error",
			});
		}

		return c.json({
			status: "healthy",
			timestamp: new Date().toISOString(),
			configuration: {
				baseDomain: baseDomainStatus,
			},
			authentication: {
				multiUser: firestoreStatus === "connected" ? "enabled" : "disabled",
			},
			firestore: {
				status: firestoreStatus,
				connectedUsers: connectedUsersCount,
			},
		});
	} catch (error) {
		logger.error("Health check error", {
			error: error instanceof Error ? error.message : "Unknown error",
		});
		return c.json(
			{
				status: "unhealthy",
				timestamp: new Date().toISOString(),
				error: "Health check failed",
			},
			500,
		);
	}
});

router.post("/checkin", async (c) => {
	try {
		const contentType = c.req.header("content-type") || "";
		let rawPayload: unknown;

		if (contentType.includes("application/json")) {
			// JSON format
			rawPayload = await c.req.json();
		} else if (contentType.includes("application/x-www-form-urlencoded")) {
			// Form data format (Foursquare default)
			const formData = await c.req.formData();
			rawPayload = {
				user: JSON.parse(formData.get("user") as string),
				checkin: formData.get("checkin") as string,
				secret: formData.get("secret") as string,
			};
		} else {
			throw new Error(`Unsupported content type: ${contentType}`);
		}

		const payload = validateWebhookPayload(rawPayload);

		const result = await handleCheckinWebhook(
			payload,
			config.discordWebhookUrl,
			config.foursquarePushSecret,
			c.req.header("cf-connecting-ip"),
		);

		// Always return 200 OK for webhooks (Foursquare requirement)
		return c.json(result, 200);
	} catch (error) {
		logger.error("Webhook endpoint error:", error);

		// Always return 200 OK for webhooks, even on error
		return c.json(
			{
				success: false,
				message: error instanceof Error ? error.message : "Unknown error",
			},
			200,
		);
	}
});

export default router;
