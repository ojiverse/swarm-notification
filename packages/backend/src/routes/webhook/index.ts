import { Hono } from "hono";
import { loadDebugConfig } from "../../config.js";
import { isDebugAuthenticated } from "../../services/auth.js";
import {
	handleCheckinWebhook,
	validateWebhookPayload,
} from "../../services/webhook.js";
import { logger } from "../../utils/logger.js";

const router = new Hono();
const config = loadDebugConfig();
const securityLogger = logger.getSubLogger({ name: "security" });

router.get("/health", (c) => {
	return c.json({
		status: "healthy",
		timestamp: new Date().toISOString(),
		authentication: isDebugAuthenticated(config.debugFoursquareUserId)
			? "active"
			: "inactive",
	});
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

		// Verify this is the authenticated debug user
		if (!isDebugAuthenticated(payload.user.id)) {
			securityLogger.warn("Unauthorized webhook attempt", {
				userId: payload.user.id,
				ip: c.req.header("cf-connecting-ip"),
			});
			return c.json({ success: false, message: "Unauthorized" }, 200);
		}

		const result = await handleCheckinWebhook(
			payload,
			config.discordWebhookUrl,
			config.foursquarePushSecret,
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
