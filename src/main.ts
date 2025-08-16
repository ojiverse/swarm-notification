import { Hono } from "hono";
import { cors } from "hono/cors";
import { loadDebugConfig } from "./config.js";
import { tslogMiddleware } from "./middleware/logger.js";
import authRoutes from "./routes/auth/index.js";
import mainRoutes from "./routes/index.js";
import webhookRoutes from "./routes/webhook/index.js";
import { initializeDebugAuth } from "./services/auth.js";
import { logger } from "./utils/logger.js";

const app = new Hono();

// Middleware
app.use("*", cors());
app.use("*", tslogMiddleware());

// Load configuration
const config = loadDebugConfig();

// Initialize debug authentication
if (config.debugFoursquareUserId && config.debugAccessToken) {
	initializeDebugAuth(config.debugFoursquareUserId, config.debugAccessToken)
		.then(() => {
			logger.info("Debug authentication ready");
		})
		.catch((error) => {
			logger.error("Failed to initialize debug authentication:", error);
		});
}

// Routes
app.route("/", mainRoutes);
app.route("/auth", authRoutes);
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
