import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { loadDebugConfig } from "./config.js";
import { tslogMiddleware } from "./middleware/logger.js";
import authRoutes from "./routes/auth/index.js";
import mainRoutes from "./routes/index.js";
import testFirestoreRoutes from "./routes/test/firestore.js";
import webhookRoutes from "./routes/webhook/index.js";
import { initializeDebugAuth } from "./services/auth.js";
import { logger } from "./utils/logger.js";

// Create and configure Hono app
function createApp(): Hono {
	const app = new Hono();

	// Middleware
	app.use("*", cors());
	app.use("*", tslogMiddleware());

	// Routes
	app.route("/", mainRoutes);
	app.route("/auth", authRoutes);
	app.route("/webhook", webhookRoutes);

	// Test routes (development only)
	if (process.env["NODE_ENV"] === "development") {
		app.route("/test", testFirestoreRoutes);
	}

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

	return app;
}

// Initialize application
async function main(): Promise<void> {
	logger.info(`environment: ${process.env["NODE_ENV"] ?? "development"}`);
	try {
		// Create app
		const app = createApp();

		// Load configuration
		const config = loadDebugConfig();
		logger.info("Configuration loaded", {
			port: config.port,
			hasDebugUserId: !!config.debugFoursquareUserId,
			hasDebugToken: !!config.debugAccessToken,
		});

		// Initialize debug authentication if credentials are available
		if (config.debugFoursquareUserId && config.debugAccessToken) {
			await initializeDebugAuth(
				config.debugFoursquareUserId,
				config.debugAccessToken,
			);
			logger.info("Debug authentication initialized");
		} else {
			logger.warn("Debug authentication not initialized - missing credentials");
		}

		// Start server
		const server = serve({
			fetch: app.fetch,
			port: config.port,
			hostname: "0.0.0.0", // Important for Docker containers
		});

		logger.info(`🚀 Swarm API server started`, {
			port: config.port,
			hostname: "0.0.0.0",
			env: process.env["NODE_ENV"] || "development",
		});

		// Graceful shutdown handling
		const gracefulShutdown = (signal: string) => {
			logger.info(`Received ${signal}, shutting down gracefully`);
			server.close(() => {
				logger.info("Server closed");
				process.exit(0);
			});
		};

		process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
		process.on("SIGINT", () => gracefulShutdown("SIGINT"));
	} catch (error) {
		logger.error("Failed to initialize application:", error);
		process.exit(1);
	}
}

// Start server
main();
