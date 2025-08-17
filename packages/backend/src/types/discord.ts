// Discord API types
export type DiscordUser = {
	readonly id: string;
	readonly username: string;
	readonly global_name?: string;
};

export type DiscordGuild = {
	readonly id: string;
	readonly name: string;
};

// Discord webhook payload types (for outgoing webhooks - no validation needed)
export type DiscordWebhookPayload = {
	readonly content?: string;
	readonly embeds?: ReadonlyArray<DiscordEmbed>;
};

export type DiscordEmbed = {
	readonly title?: string;
	readonly description?: string;
	readonly color?: number;
	readonly timestamp?: string;
	readonly fields?: ReadonlyArray<{
		readonly name: string;
		readonly value: string;
		readonly inline?: boolean;
	}>;
};
