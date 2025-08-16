export type TokenResponse = {
	readonly access_token: string;
	readonly token_type: string;
};

export type UserInfo = {
	readonly id: string;
	readonly firstName: string;
	readonly lastName?: string;
};
