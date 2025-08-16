import type { TokenResponse, UserInfo } from "../types/oauth.js";

export const exchangeCodeForToken = async (
	code: string,
): Promise<TokenResponse> => {
	const clientId = process.env.FOURSQUARE_CLIENT_ID;
	const clientSecret = process.env.FOURSQUARE_CLIENT_SECRET;
	const redirectUri = process.env.FOURSQUARE_REDIRECT_URI;

	if (!clientId || !clientSecret || !redirectUri) {
		throw new Error("Missing required OAuth environment variables");
	}

	const response = await fetch("https://foursquare.com/oauth2/access_token", {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: new URLSearchParams({
			client_id: clientId,
			client_secret: clientSecret,
			grant_type: "authorization_code",
			redirect_uri: redirectUri,
			code,
		}),
	});

	if (!response.ok) {
		throw new Error(`Token exchange failed: ${response.statusText}`);
	}

	return response.json();
};

export const getUserInfo = async (accessToken: string): Promise<UserInfo> => {
	const response = await fetch(
		"https://api.foursquare.com/v2/users/self?v=20231010",
		{
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		},
	);

	if (!response.ok) {
		throw new Error(`User info fetch failed: ${response.statusText}`);
	}

	const data = await response.json();
	return {
		id: data.response.user.id,
		firstName: data.response.user.firstName,
		lastName: data.response.user.lastName,
	};
};
