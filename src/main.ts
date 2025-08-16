import { Hono } from "hono";
import { cors } from "hono/cors";
import { loadConfig } from "./config.js";
import { logger } from "./utils/logger.js";
import { tslogMiddleware } from "./middleware/logger.js";
import mainRoutes from "./routes/index.js";
import webhookRoutes from "./routes/webhook/index.js";

const app = new Hono();

// Middleware
app.use("*", cors());
app.use("*", tslogMiddleware());

// Load configuration
const config = loadConfig();

// Routes
app.route("/", mainRoutes);
app.route("/webhook", webhookRoutes);

// Error handler
app.onError((err, c) => {
	logger.error("Application error:", err);
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
		logger.info(`🚀 Starting Swarm API server on port ${config.port}`);
		serve({
			fetch: app.fetch,
			port: config.port,
		});
	});
}
