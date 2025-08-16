import { Hono } from "hono";
import { exchangeCodeForToken, getUserInfo } from "../../services/oauth.js";

const swarmAuthRouter = new Hono();

swarmAuthRouter.get("/login", (c) => {
	const clientId = process.env.FOURSQUARE_CLIENT_ID;
	const redirectUri = process.env.FOURSQUARE_REDIRECT_URI;

	if (!clientId || !redirectUri) {
		return c.text("Missing OAuth configuration", 500);
	}

	const authUrl = new URL("https://foursquare.com/oauth2/authenticate");
	authUrl.searchParams.set("client_id", clientId);
	authUrl.searchParams.set("response_type", "code");
	authUrl.searchParams.set("redirect_uri", redirectUri);

	return c.redirect(authUrl.toString());
});

swarmAuthRouter.get("/callback", async (c) => {
	const code = c.req.query("code");
	const error = c.req.query("error");

	if (error) {
		return c.html(`
      <html>
        <body>
          <h1>Authentication Error</h1>
          <p>Error: ${error}</p>
          <a href="/auth/swarm/login">Try Again</a>
        </body>
      </html>
    `);
	}

	if (!code) {
		return c.html(`
      <html>
        <body>
          <h1>Missing Authorization Code</h1>
          <p>No authorization code received from Foursquare</p>
          <a href="/auth/swarm/login">Try Again</a>
        </body>
      </html>
    `);
	}

	try {
		const tokenResponse = await exchangeCodeForToken(code);
		const userInfo = await getUserInfo(tokenResponse.access_token);

		return c.html(`
      <html>
        <body>
          <h1>Debug Token Retrieved</h1>
          <p><strong>User ID:</strong> ${userInfo.id}</p>
          <p><strong>Name:</strong> ${userInfo.firstName} ${userInfo.lastName || ""}</p>
          
          <h2>Environment Variables</h2>
          <p>Add these to your .env.local file:</p>
          <pre style="background: #f4f4f4; padding: 10px; border-radius: 4px;">
DEBUG_FOURSQUARE_USER_ID=${userInfo.id}
DEBUG_ACCESS_TOKEN=${tokenResponse.access_token}
          </pre>
          
          <p style="color: red;"><strong>Security Note:</strong> Save these values securely and don't share them!</p>
          <button onclick="copyToClipboard()">Copy to Clipboard</button>
          
          <script>
            function copyToClipboard() {
              const text = \`DEBUG_FOURSQUARE_USER_ID=${userInfo.id}
DEBUG_ACCESS_TOKEN=${tokenResponse.access_token}\`;
              navigator.clipboard.writeText(text);
              alert('Copied to clipboard!');
            }
          </script>
        </body>
      </html>
    `);
	} catch (error) {
		return c.html(`
      <html>
        <body>
          <h1>Token Exchange Error</h1>
          <p>Failed to exchange code for token: ${(error as Error).message}</p>
          <a href="/auth/swarm/login">Try Again</a>
        </body>
      </html>
    `);
	}
});

export default swarmAuthRouter;
