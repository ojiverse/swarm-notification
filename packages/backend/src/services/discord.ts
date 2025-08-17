import type { DiscordGuild, DiscordUser } from "../types/auth.js";
import type {
	DiscordEmbed,
	DiscordWebhookPayload,
	ParsedCheckin,
	Venue,
} from "../types.js";
import { logger } from "../utils/logger.js";

const discordLogger = logger.getSubLogger({ name: "discord" });

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
		discordLogger.error("Failed to send checkin to Discord:", error);
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

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_TARGET_SERVER_ID = process.env.DISCORD_TARGET_SERVER_ID;

if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET || !DISCORD_TARGET_SERVER_ID) {
	throw new Error(
		"Discord OAuth environment variables (DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_TARGET_SERVER_ID) are required",
	);
}

const DISCORD_API_BASE = "https://discord.com/api/v10";
const DISCORD_OAUTH_BASE = "https://discord.com/oauth2";

export async function exchangeCodeForToken(code: string): Promise<string> {
	try {
		const tokenUrl = `${DISCORD_OAUTH_BASE}/token`;
		const params = new URLSearchParams({
			client_id: DISCORD_CLIENT_ID,
			client_secret: DISCORD_CLIENT_SECRET,
			grant_type: "authorization_code",
			code,
			redirect_uri: `${process.env.FOURSQUARE_REDIRECT_URI?.replace("/auth/swarm/callback", "/auth/discord/callback")}`,
		});

		const response = await fetch(tokenUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: params,
		});

		if (!response.ok) {
			const errorText = await response.text();
			discordLogger.error("Discord token exchange failed", {
				status: response.status,
				error: errorText,
			});
			throw new Error("Failed to exchange code for token");
		}

		const data = await response.json();
		if (!data.access_token) {
			throw new Error("No access token in Discord response");
		}

		discordLogger.info("Discord token exchange successful");
		return data.access_token;
	} catch (error) {
		discordLogger.error("Discord token exchange error", {
			error: error instanceof Error ? error.message : "Unknown error",
		});
		throw error;
	}
}

export async function getDiscordUser(
	accessToken: string,
): Promise<DiscordUser> {
	try {
		const response = await fetch(`${DISCORD_API_BASE}/users/@me`, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (!response.ok) {
			const errorText = await response.text();
			discordLogger.error("Discord user fetch failed", {
				status: response.status,
				error: errorText,
			});
			throw new Error("Failed to fetch Discord user");
		}

		const user = await response.json();

		// Validate response structure
		if (!user.id || !user.username) {
			throw new Error("Invalid Discord user response");
		}

		discordLogger.info("Discord user fetch successful", {
			discordUserId: user.id,
			discordUsername: user.username,
		});

		return {
			id: user.id,
			username: user.username,
			global_name: user.global_name,
		};
	} catch (error) {
		discordLogger.error("Discord user fetch error", {
			error: error instanceof Error ? error.message : "Unknown error",
		});
		throw error;
	}
}

export async function getUserGuilds(
	accessToken: string,
): Promise<DiscordGuild[]> {
	try {
		const response = await fetch(`${DISCORD_API_BASE}/users/@me/guilds`, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (!response.ok) {
			const errorText = await response.text();
			discordLogger.error("Discord guilds fetch failed", {
				status: response.status,
				error: errorText,
			});
			throw new Error("Failed to fetch Discord guilds");
		}

		const guilds = await response.json();

		// Validate response is array
		if (!Array.isArray(guilds)) {
			throw new Error("Invalid Discord guilds response");
		}

		discordLogger.info("Discord guilds fetch successful", {
			guildCount: guilds.length,
		});

		return guilds.map((guild) => ({
			id: guild.id,
			name: guild.name,
		}));
	} catch (error) {
		discordLogger.error("Discord guilds fetch error", {
			error: error instanceof Error ? error.message : "Unknown error",
		});
		throw error;
	}
}

export function isServerMember(
	guilds: DiscordGuild[],
	targetServerId: string,
): boolean {
	const isMember = guilds.some((guild) => guild.id === targetServerId);
	discordLogger.info("Server membership check", {
		targetServerId,
		isMember,
		guildCount: guilds.length,
	});
	return isMember;
}

export function getDiscordOAuthURL(): string {
	const redirectUri = process.env.FOURSQUARE_REDIRECT_URI?.replace(
		"/auth/swarm/callback",
		"/auth/discord/callback",
	);

	const params = new URLSearchParams({
		client_id: DISCORD_CLIENT_ID,
		redirect_uri: redirectUri || "",
		response_type: "code",
		scope: "identify guilds",
	});

	return `${DISCORD_OAUTH_BASE}/authorize?${params.toString()}`;
}

export { sendCheckinToDiscord, createDiscordEmbed, formatLocationString };
