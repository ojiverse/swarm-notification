import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { loadConfig } from "./config.js";
import { handleCheckinWebhook, validateWebhookPayload } from "./webhook.js";

const app = new Hono();

// Middleware
app.use("*", cors());
app.use("*", logger());

// Load configuration
const config = loadConfig();

// Routes
app.get("/", (c) => {
	return c.json({
		message: "Swarm API Webhook Server",
		status: "running",
		timestamp: new Date().toISOString(),
	});
});

app.get("/webhook/health", (c) => {
	return c.json({
		status: "healthy",
		timestamp: new Date().toISOString(),
	});
});

app.post("/webhook/checkin", async (c) => {
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
		);

		// Always return 200 OK for webhooks (Foursquare requirement)
		return c.json(result, 200);
	} catch (error) {
		console.error("Webhook endpoint error:", error);

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

// Error handler
app.onError((err, c) => {
	console.error("Application error:", err);
	return c.json(
		{
			error: "Internal server error",
			message: err.message,
		},
		500,
	);
});

// 404 handler
app.notFound((c) => {
	return c.json(
		{
			error: "Not found",
			message: "The requested endpoint was not found",
		},
		404,
	);
});

// Cloud Functions export
export default app;

// Node.js server for local development
if (import.meta.url === `file://${process.argv[1]}`) {
	import("@hono/node-server").then(({ serve }) => {
		console.log(`🚀 Starting Swarm API server on port ${config.port}`);
		serve({
			fetch: app.fetch,
			port: config.port,
		});
	});
}
