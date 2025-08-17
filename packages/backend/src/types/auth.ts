export type JWTPayload = {
	readonly discordUserId: string;
	readonly discordUsername: string;
	readonly serverMember: true;
	readonly iat: number;
	readonly exp: number;
};

export type AuthenticatedContext = {
	user: JWTPayload;
};

export type DiscordUser = {
	readonly id: string;
	readonly username: string;
	readonly global_name?: string;
};

export type DiscordGuild = {
	readonly id: string;
	readonly name: string;
};
