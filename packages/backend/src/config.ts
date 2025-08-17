import {
	type Config,
	ConfigSchema,
	type DebugConfig,
	DebugConfigSchema,
} from "./types.js";

function loadConfig(): Config {
	return ConfigSchema.parse({
		port: Number(process.env["PORT"]) || 3000,
		foursquarePushSecret: process.env["FOURSQUARE_PUSH_SECRET"],
		discordWebhookUrl: process.env["DISCORD_WEBHOOK_URL"],
	});
}

export const loadDebugConfig = (): DebugConfig => {
	return DebugConfigSchema.parse({
		port: Number(process.env["PORT"]) || 3000,
		foursquarePushSecret: process.env["FOURSQUARE_PUSH_SECRET"],
		discordWebhookUrl: process.env["DISCORD_WEBHOOK_URL"],
		debugFoursquareUserId: process.env["DEBUG_FOURSQUARE_USER_ID"],
		debugAccessToken: process.env["DEBUG_ACCESS_TOKEN"],
	});
};

export { loadConfig };
