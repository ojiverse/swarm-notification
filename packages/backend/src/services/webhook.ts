import { timingSafeEqual } from "node:crypto";
import { Timestamp } from "@google-cloud/firestore";
import {
	type ParsedCheckin,
	ParsedCheckinSchema,
	type WebhookPayload,
	WebhookPayloadSchema,
} from "../types.js";
import { logger } from "../utils/logger.js";
import { userRepository } from "./user-repository.js";

const webhookLogger = logger.getSubLogger({ name: "webhook" });
const securityLogger = logger.getSubLogger({ name: "security" });

import { sendCheckinToDiscord } from "./discord.js";

async function handleCheckinWebhook(
	payload: WebhookPayload,
	discordWebhookUrl: string,
	pushSecret: string,
	clientIp?: string,
): Promise<{ readonly success: boolean; readonly message: string }> {
	try {
		// Verify secret using timing-safe comparison
		const expectedSecret = Buffer.from(pushSecret, "utf8");
		const providedSecret = Buffer.from(payload.secret, "utf8");

		if (
			expectedSecret.length !== providedSecret.length ||
			!timingSafeEqual(expectedSecret, providedSecret)
		) {
			securityLogger.warn("Webhook secret mismatch", {
				foursquareUserId: payload.user.id,
				ip: clientIp,
				timestamp: new Date().toISOString(),
			});
			return {
				success: false,
				message: "Invalid request",
			};
		}

		// Check if user exists in Firestore (multi-user support)
		const user = await userRepository.getUserByFoursquareId(payload.user.id);
		if (!user) {
			securityLogger.warn("Webhook from unknown user", {
				foursquareUserId: payload.user.id,
				ip: clientIp,
			});
			return {
				success: false,
				message: "User not found",
			};
		}

		securityLogger.info("Webhook processed for registered user", {
			foursquareUserId: payload.user.id,
			discordUserId: user.discordUserId,
			discordUsername: user.discordUsername,
		});

		// Update last checkin timestamp
		try {
			await userRepository.updateUser(user.discordUserId, {
				lastCheckinAt: Timestamp.now(),
			});
		} catch (error) {
			webhookLogger.warn("Failed to update lastCheckinAt", {
				error: error instanceof Error ? error.message : "Unknown error",
				foursquareUserId: payload.user.id,
			});
		}

		// Parse checkin data
		const checkin = parseCheckinData(payload.checkin);

		// Send to Discord asynchronously (don't wait for response)
		processCheckinAsync(checkin, discordWebhookUrl).catch((error) => {
			webhookLogger.error("Failed to process checkin asynchronously:", error);
		});

		return {
			success: true,
			message: "Checkin received and processing",
		};
	} catch (error) {
		webhookLogger.error("Error handling checkin webhook:", error);
		return {
			success: false,
			message: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

function validateWebhookPayload(payload: unknown): WebhookPayload {
	return WebhookPayloadSchema.parse(payload);
}

function parseCheckinData(checkinJson: string): ParsedCheckin {
	const parsed = JSON.parse(checkinJson);
	return ParsedCheckinSchema.parse(parsed);
}

async function processCheckinAsync(
	checkin: ParsedCheckin,
	discordWebhookUrl: string,
): Promise<void> {
	try {
		const success = await sendCheckinToDiscord(checkin, discordWebhookUrl);
		if (success) {
			webhookLogger.info(`Successfully sent checkin ${checkin.id} to Discord`);
		} else {
			webhookLogger.error(`Failed to send checkin ${checkin.id} to Discord`);
		}
	} catch (error) {
		webhookLogger.error(`Error processing checkin ${checkin.id}:`, error);
		throw error;
	}
}

export {
	handleCheckinWebhook,
	validateWebhookPayload,
	parseCheckinData,
	processCheckinAsync,
};
