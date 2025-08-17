// JWT and authentication types
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
