import type { Timestamp } from "@google-cloud/firestore";

export type UserRecord = {
	readonly discordUserId: string;
	readonly discordUsername: string;
	readonly discordDisplayName?: string;
	readonly foursquareUserId?: string;
	readonly connectedAt?: Timestamp;
	readonly createdAt: Timestamp;
	readonly lastUpdatedAt: Timestamp;
	readonly lastCheckinAt?: Timestamp;
};

export type CreateUserData = Pick<
	UserRecord,
	"discordUserId" | "discordUsername"
> & {
	readonly discordDisplayName?: string;
};

export type UpdateUserData = Partial<
	Omit<UserRecord, "discordUserId" | "createdAt">
>;
