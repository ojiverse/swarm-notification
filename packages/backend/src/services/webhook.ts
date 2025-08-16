import {
	type ParsedCheckin,
	ParsedCheckinSchema,
	type WebhookPayload,
	WebhookPayloadSchema,
} from "../types.js";
import { logger } from "../utils/logger.js";

const webhookLogger = logger.getSubLogger({ name: "webhook" });

import { sendCheckinToDiscord } from "./discord.js";

async function handleCheckinWebhook(
	payload: WebhookPayload,
	discordWebhookUrl: string,
	pushSecret: string,
): Promise<{ readonly success: boolean; readonly message: string }> {
	try {
		// Verify secret
		if (payload.secret !== pushSecret) {
			return {
				success: false,
				message: "Invalid push secret",
			};
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
