import * as jose from "jose";
import type { JWTPayload } from "../types/auth.js";
import { logger } from "../utils/logger.js";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
	throw new Error("JWT_SECRET environment variable is required");
}

const secret = new TextEncoder().encode(JWT_SECRET);
const JWT_EXPIRY = "7d"; // 7 days

export async function createJWT(
	payload: Omit<JWTPayload, "iat" | "exp">,
): Promise<string> {
	try {
		const jwt = await new jose.SignJWT(payload)
			.setProtectedHeader({ alg: "HS256" })
			.setIssuedAt()
			.setExpirationTime(JWT_EXPIRY)
			.sign(secret);

		logger.info("JWT created successfully", {
			discordUserId: payload.discordUserId,
			discordUsername: payload.discordUsername,
		});

		return jwt;
	} catch (error) {
		logger.error("Failed to create JWT", {
			error: error instanceof Error ? error.message : "Unknown error",
			discordUserId: payload.discordUserId,
		});
		throw new Error("Failed to create JWT token");
	}
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
	try {
		const { payload } = await jose.jwtVerify(token, secret);

		// Validate payload structure
		if (
			typeof payload.discordUserId !== "string" ||
			typeof payload.discordUsername !== "string" ||
			payload.serverMember !== true ||
			typeof payload.iat !== "number" ||
			typeof payload.exp !== "number"
		) {
			logger.warn("Invalid JWT payload structure", {
				hasDiscordUserId: typeof payload.discordUserId === "string",
				hasDiscordUsername: typeof payload.discordUsername === "string",
				serverMember: payload.serverMember,
			});
			return null;
		}

		return payload as JWTPayload;
	} catch (error) {
		if (error instanceof jose.errors.JWTExpired) {
			logger.debug("JWT token expired");
		} else if (error instanceof jose.errors.JWTInvalid) {
			logger.debug("JWT token invalid");
		} else {
			logger.error("JWT verification failed", {
				error: error instanceof Error ? error.message : "Unknown error",
			});
		}
		return null;
	}
}
