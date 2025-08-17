import * as jose from "jose";
import type { JWTPayload } from "../types/auth.js";
import { logger } from "../utils/logger.js";

const JWT_SECRET = process.env["JWT_SECRET"];
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
		// jose.jwtVerify performs comprehensive verification:
		// 1. Signature verification using the secret
		// 2. Expiration time validation (exp claim)
		// 3. Not before time validation (nbf claim, if present)
		// 4. Issued at time validation (iat claim)
		// 5. Algorithm verification (prevents algorithm confusion attacks)
		const { payload } = await jose.jwtVerify(token, secret, {
			// Additional security options
			clockTolerance: "30s", // Allow 30 seconds clock skew
			algorithms: ["HS256"], // Only allow HMAC with SHA-256
		});

		// Validate application-specific payload structure
		if (
			typeof payload["discordUserId"] !== "string" ||
			typeof payload["discordUsername"] !== "string" ||
			payload["serverMember"] !== true ||
			typeof payload["iat"] !== "number" ||
			typeof payload["exp"] !== "number"
		) {
			logger.warn("Invalid JWT payload structure", {
				hasDiscordUserId: typeof payload["discordUserId"] === "string",
				hasDiscordUsername: typeof payload["discordUsername"] === "string",
				serverMember: payload["serverMember"],
			});
			return null;
		}

		logger.debug("JWT verification successful", {
			discordUserId: payload["discordUserId"],
			expiresAt: new Date((payload["exp"] as number) * 1000).toISOString(),
		});

		return payload as JWTPayload;
	} catch (error) {
		if (error instanceof jose.errors.JWTExpired) {
			logger.debug("JWT token expired");
		} else if (error instanceof jose.errors.JWTInvalid) {
			logger.debug("JWT token invalid (signature or format)");
		} else if (error instanceof jose.errors.JWTClaimValidationFailed) {
			logger.debug("JWT claim validation failed");
		} else {
			logger.error("JWT verification failed", {
				error: error instanceof Error ? error.message : "Unknown error",
			});
		}
		return null;
	}
}
