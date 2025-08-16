import type {
	DiscordEmbed,
	DiscordWebhookPayload,
	ParsedCheckin,
	Venue,
} from "./types.js";

async function sendCheckinToDiscord(
	checkin: ParsedCheckin,
	webhookUrl: string,
): Promise<boolean> {
	try {
		const embed = createDiscordEmbed(checkin);
		const payload: DiscordWebhookPayload = {
			embeds: [embed],
		};

		const response = await postToDiscordWebhook(payload, webhookUrl);
		return response.ok;
	} catch (error) {
		console.error("Failed to send checkin to Discord:", error);
		return false;
	}
}

function createDiscordEmbed(checkin: ParsedCheckin): DiscordEmbed {
	const userName = `${checkin.user.firstName}${
		checkin.user.lastName ? ` ${checkin.user.lastName}` : ""
	}`;

	const fields: Array<{
		name: string;
		value: string;
		inline?: boolean;
	}> = [
		{
			name: "👤 User",
			value: userName,
			inline: true,
		},
	];

	if (checkin.venue) {
		fields.push({
			name: "📍 Venue",
			value: checkin.venue.name,
			inline: true,
		});

		const locationString = formatLocationString(checkin.venue);
		if (locationString) {
			fields.push({
				name: "🗺️ Location",
				value: locationString,
				inline: false,
			});
		}
	}

	if (checkin.score) {
		fields.push({
			name: "🎯 Score",
			value: `${checkin.score.total} points`,
			inline: true,
		});
	}

	const embed: DiscordEmbed = {
		title: "🏃‍♂️ New Swarm Check-in",
		description: checkin.shout || "Checked in!",
		color: 0xff6600, // Foursquare orange
		timestamp: new Date(checkin.createdAt * 1000).toISOString(),
		fields,
	};

	return embed;
}

function formatLocationString(venue?: Venue): string {
	if (!venue?.location) return "";

	const parts: string[] = [];

	if (venue.location.address) {
		parts.push(venue.location.address);
	}

	if (venue.location.city) {
		parts.push(venue.location.city);
	}

	if (venue.location.country) {
		parts.push(venue.location.country);
	}

	return parts.join(", ");
}

async function postToDiscordWebhook(
	payload: DiscordWebhookPayload,
	webhookUrl: string,
): Promise<Response> {
	return fetch(webhookUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(payload),
	});
}

export { sendCheckinToDiscord, createDiscordEmbed, formatLocationString };
