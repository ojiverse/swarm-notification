import type { MiddlewareHandler } from "hono";
import { logger } from "../utils/logger.js";

const isProduction = process.env["NODE_ENV"] === "production";

export const tslogMiddleware = (): MiddlewareHandler => {
	return async (c, next) => {
		const start = Date.now();
		const method = c.req.method;
		const url = c.req.url;

		if (isProduction) {
			logger.info("HTTP request started", { method, url });
		} else {
			logger.info(`--> ${method} ${url}`);
		}

		await next();

		const end = Date.now();
		const status = c.res.status;
		const duration = end - start;

		const logLevel = status >= 400 ? "error" : status >= 300 ? "warn" : "info";

		if (isProduction) {
			logger[logLevel]("HTTP request completed", {
				method,
				url,
				status,
				duration,
			});
		} else {
			logger[logLevel](`<-- ${method} ${url} ${status} ${duration}ms`);
		}
	};
};
