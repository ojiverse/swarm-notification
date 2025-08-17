import type { Context, MiddlewareHandler, Next } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { createJWT, verifyJWT } from "../lib/jwt.js";
import type { AuthenticatedContext, JWTPayload } from "../types/auth.js";
import { logger } from "../utils/logger.js";

const JWT_COOKIE_NAME = "auth_token";
const COOKIE_OPTIONS = {
	httpOnly: true,
	secure: process.env["NODE_ENV"] === "production",
	sameSite: "strict" as const,
	maxAge: 60 * 60 * 24 * 7, // 7 days
	path: "/",
};

export function setJWTCookie(
	c: Context,
	payload: Omit<JWTPayload, "iat" | "exp">,
): Promise<void> {
	return createJWT(payload).then((token) => {
		setCookie(c, JWT_COOKIE_NAME, token, COOKIE_OPTIONS);
		logger.info("JWT cookie set", {
			discordUserId: payload.discordUserId,
			discordUsername: payload.discordUsername,
		});
	});
}

export function clearJWTCookie(c: Context): void {
	setCookie(c, JWT_COOKIE_NAME, "", {
		...COOKIE_OPTIONS,
		maxAge: 0,
	});
	logger.info("JWT cookie cleared");
}

export function jwtAuth(): MiddlewareHandler<{
	Variables: AuthenticatedContext;
}> {
	return async (c, next: Next) => {
		const token = getCookie(c, JWT_COOKIE_NAME);

		if (!token) {
			logger.debug("No JWT token found in cookie");
			return c.json({ error: "Authentication required" }, 401);
		}

		const payload = await verifyJWT(token);
		if (!payload) {
			logger.debug("Invalid JWT token");
			clearJWTCookie(c);
			return c.json({ error: "Invalid or expired token" }, 401);
		}

		// Set user context for authenticated requests
		c.set("user", payload);

		logger.debug("JWT authentication successful", {
			discordUserId: payload.discordUserId,
			discordUsername: payload.discordUsername,
		});

		await next();
		return;
	};
}

export function requireAuth(): MiddlewareHandler<{
	Variables: AuthenticatedContext;
}> {
	return jwtAuth();
}
