import { randomBytes } from "node:crypto";
import { logger } from "../utils/logger.js";

const stateLogger = logger.getSubLogger({ name: "oauth.state" });

// In-memory store for OAuth state (for production, consider Redis or database)
const oauthStateStore = new Map<string, { timestamp: number }>();
const STATE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

// Cleanup expired states periodically
setInterval(
	() => {
		const now = Date.now();
		for (const [state, data] of oauthStateStore.entries()) {
			if (now - data.timestamp > STATE_EXPIRY_MS) {
				oauthStateStore.delete(state);
			}
		}
	},
	5 * 60 * 1000,
); // Run cleanup every 5 minutes

export function generateOAuthState(): string {
	const state = randomBytes(32).toString("hex");
	oauthStateStore.set(state, { timestamp: Date.now() });
	stateLogger.debug("OAuth state generated", { state });
	return state;
}

export function validateOAuthState(state: string): boolean {
	const stored = oauthStateStore.get(state);
	if (!stored) {
		stateLogger.warn("OAuth state not found", { state });
		return false;
	}

	// Check if state is expired
	if (Date.now() - stored.timestamp > STATE_EXPIRY_MS) {
		oauthStateStore.delete(state);
		stateLogger.warn("OAuth state expired", { state });
		return false;
	}

	// Remove state after validation (one-time use)
	oauthStateStore.delete(state);
	stateLogger.debug("OAuth state validated", { state });
	return true;
}
