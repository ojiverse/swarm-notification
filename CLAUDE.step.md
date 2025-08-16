# CLAUDE.step.md - Debug User Push API Implementation Steps

## Goal
Implement a local development environment to receive specific user's check-in data via Foursquare Real-time Push API.

## Step 1: OAuth Token Acquisition Setup

### 1.1 Verify Dependencies
Dependencies already installed: `hono` and `zod`

### 1.2 Create OAuth Types
```typescript
// src/types/oauth.ts
export type TokenResponse = {
  readonly access_token: string;
  readonly token_type: string;
};

export type UserInfo = {
  readonly id: string;
  readonly firstName: string;
  readonly lastName?: string;
};
```

### 1.3 Create OAuth Service
```typescript
// src/services/oauth.ts
import type { TokenResponse, UserInfo } from "../types/oauth.js";

export const exchangeCodeForToken = async (code: string): Promise<TokenResponse> => {
  const response = await fetch("https://foursquare.com/oauth2/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env["FOURSQUARE_CLIENT_ID"]!,
      client_secret: process.env["FOURSQUARE_CLIENT_SECRET"]!,
      grant_type: "authorization_code",
      redirect_uri: process.env["FOURSQUARE_REDIRECT_URI"]!,
      code,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.statusText}`);
  }

  return response.json();
};

export const getUserInfo = async (accessToken: string): Promise<UserInfo> => {
  const response = await fetch("https://api.foursquare.com/v2/users/self?v=20231010", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

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
```

### 1.4 Create Swarm OAuth Routes
```typescript
// src/routes/auth/swarm.ts
import { Hono } from "hono";
import { exchangeCodeForToken, getUserInfo } from "../../services/oauth.js";

const swarmAuthRouter = new Hono();

swarmAuthRouter.get("/login", (c) => {
  const clientId = process.env["FOURSQUARE_CLIENT_ID"];
  const redirectUri = process.env["FOURSQUARE_REDIRECT_URI"];
  
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
  
  try {
    const tokenResponse = await exchangeCodeForToken(code);
    const userInfo = await getUserInfo(tokenResponse.access_token);
    
    return c.html(`
      <html>
        <body>
          <h1>Debug Token Retrieved</h1>
          <p><strong>User ID:</strong> ${userInfo.id}</p>
          <p><strong>Name:</strong> ${userInfo.firstName} ${userInfo.lastName || ''}</p>
          
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
          <p>Failed to exchange code for token: ${error.message}</p>
          <a href="/auth/swarm/login">Try Again</a>
        </body>
      </html>
    `);
  }
});

export default swarmAuthRouter;
```

### 1.5 Create Auth Router Hub
```typescript
// src/routes/auth/index.ts
import { Hono } from "hono";
import swarmAuthRouter from "./swarm.js";

const authRouter = new Hono();

// Mount service-specific auth routes
authRouter.route("/swarm", swarmAuthRouter);

// Future: authRouter.route("/google", googleAuthRouter);
// Future: authRouter.route("/twitter", twitterAuthRouter);

export default authRouter;
```

**Step 1 Completion:**
```bash
pnpm format
pnpm check:types
pnpm build
git add .
git commit -m "feat: add OAuth token acquisition flow for debug user authentication"
```

## Step 2: Core Types and Configuration

### 2.1 Create Core Types
```typescript
// src/types.ts
import { z } from "zod";

// Zod Schemas
const WebhookPayloadSchema = z.object({
  user: z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string().optional(),
  }),
  checkin: z.string(),
  secret: z.string(),
});

const UserSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string().optional(),
});

const VenueSchema = z.object({
  id: z.string(),
  name: z.string(),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
});

const ParsedCheckinSchema = z.object({
  id: z.string(),
  createdAt: z.number(),
  type: z.literal("checkin"),
  shout: z.string().optional(),
  user: UserSchema,
  venue: VenueSchema.optional(),
  score: z.object({
    total: z.number(),
    scores: z.array(z.object({
      points: z.number(),
      message: z.string(),
      icon: z.string().optional(),
    })),
  }).optional(),
});

const DebugConfigSchema = z.object({
  port: z.number(),
  foursquarePushSecret: z.string(),
  discordWebhookUrl: z.string().url(),
  debugFoursquareUserId: z.string().min(1),
  debugAccessToken: z.string().min(1),
});

// Type exports
export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;
export type ParsedCheckin = z.infer<typeof ParsedCheckinSchema>;
export type User = z.infer<typeof UserSchema>;
export type Venue = z.infer<typeof VenueSchema>;
export type DebugConfig = z.infer<typeof DebugConfigSchema>;

// Schema exports for validation
export { WebhookPayloadSchema, ParsedCheckinSchema, DebugConfigSchema };

// Discord types
export type DiscordWebhookPayload = {
  readonly content?: string;
  readonly embeds?: readonly DiscordEmbed[];
};

export type DiscordEmbed = {
  readonly title?: string;
  readonly description?: string;
  readonly color?: number;
  readonly timestamp?: string;
  readonly fields?: readonly {
    readonly name: string;
    readonly value: string;
    readonly inline?: boolean;
  }[];
};
```

### 2.2 Create Configuration
```typescript
// src/config.ts
import { DebugConfigSchema, type DebugConfig } from "./types.js";

export const loadDebugConfig = (): DebugConfig => {
  return DebugConfigSchema.parse({
    port: Number(process.env["PORT"]) || 3000,
    foursquarePushSecret: process.env["FOURSQUARE_PUSH_SECRET"],
    discordWebhookUrl: process.env["DISCORD_WEBHOOK_URL"],
    debugFoursquareUserId: process.env["DEBUG_FOURSQUARE_USER_ID"],
    debugAccessToken: process.env["DEBUG_ACCESS_TOKEN"],
  });
};
```

### 2.3 Create Environment Template
```bash
# .env.example
# OAuth Configuration
FOURSQUARE_CLIENT_ID=your_client_id
FOURSQUARE_CLIENT_SECRET=your_client_secret
FOURSQUARE_REDIRECT_URI=http://localhost:3000/auth/swarm/callback

# Push API Configuration
FOURSQUARE_PUSH_SECRET=your_push_secret_here
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your_webhook_id/your_webhook_token

# Debug User Configuration (obtained from OAuth flow)
DEBUG_FOURSQUARE_USER_ID=obtained_from_oauth
DEBUG_ACCESS_TOKEN=obtained_from_oauth

# Server Configuration
PORT=3000
NODE_ENV=development
```

**Step 2 Completion:**
```bash
pnpm format
pnpm check:types
pnpm build
git add .
git commit -m "feat: add core types and debug configuration with Zod validation"
```

## Step 3: Debug Authentication Service

### 3.1 Create Authentication Service
```typescript
// src/services/auth.ts
import { logger } from "../utils/logger.js";

const authLogger = logger.getSubLogger({ name: "auth" });

// Simple token storage for debug mode
let storedToken: string | null = null;
let authenticatedUserId: string | null = null;

const storeToken = (token: string): void => {
  storedToken = token;
};

const getStoredToken = (): string => {
  if (!storedToken) {
    throw new Error('No token stored');
  }
  return storedToken;
};

const clearToken = (): void => {
  storedToken = null;
};

export const validateDebugToken = async (token: string): Promise<boolean> => {
  try {
    const response = await fetch('https://api.foursquare.com/v2/users/self?v=20231010', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.ok;
  } catch (error) {
    authLogger.error('Token validation failed', { 
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
};

export const initializeDebugAuth = async (userId: string, token: string): Promise<void> => {
  const isValid = await validateDebugToken(token);
  
  if (!isValid) {
    throw new Error('Invalid debug token');
  }
  
  storeToken(token);
  authenticatedUserId = userId;
  
  authLogger.info('Debug authentication initialized', {
    userId,
  });
};

export const isDebugAuthenticated = (userId: string): boolean => {
  return authenticatedUserId === userId && storedToken !== null;
};

export const getDebugToken = async (): Promise<string> => {
  return getStoredToken();
};

export const destroyDebugAuth = (): void => {
  clearToken();
  authenticatedUserId = null;
};
```

**Step 3 Completion:**
```bash
pnpm format
pnpm check:types
pnpm build
git add .
git commit -m "feat: add debug authentication service with token validation"
```

## Step 4: Verify Existing Services

### 4.1 Discord Integration Status
✅ **Already implemented** in `src/services/discord.ts`
- Discord embed creation
- Webhook posting functionality
- Error handling with sub-logger

### 4.2 Webhook Processing Status  
✅ **Already implemented** in `src/services/webhook.ts`
- Webhook payload validation
- Secret verification
- Asynchronous Discord posting
- Error handling with sub-logger

**Step 4 Completion:**
```bash
# Services already exist, just verify they're working
pnpm check:types
```

## Step 5: Main Application

### 5.1 Create Main Hono Application
```typescript
// src/main.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { loadDebugConfig } from "./config.js";
import { tslogMiddleware } from "./middleware/logger.js";
import { initializeDebugAuth, isDebugAuthenticated } from "./services/auth.js";
import { handleCheckinWebhook, validateWebhookPayload } from "./services/webhook.js";
import { logger } from "./utils/logger.js";
import authRoutes from "./routes/auth/index.js";
import mainRoutes from "./routes/index.js";
import webhookRoutes from "./routes/webhook/index.js";

const app = new Hono();

// Middleware
app.use("*", cors());
app.use("*", tslogMiddleware());

// Load configuration
const config = loadDebugConfig();

// Initialize debug authentication
if (config.debugFoursquareUserId && config.debugAccessToken) {
  initializeDebugAuth(config.debugFoursquareUserId, config.debugAccessToken)
    .then(() => {
      logger.info("Debug authentication ready");
    })
    .catch((error) => {
      logger.error("Failed to initialize debug authentication:", error);
    });
}

// Routes
app.route("/", mainRoutes);
app.route("/auth", authRoutes);
app.route("/webhook", webhookRoutes);

// Error handler
app.onError((err, c) => {
  logger.error("Application error:", err);
  return c.json(
    {
      error: "Internal server error",
      message: err.message,
    },
    500,
  );
});

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: "Not found",
      message: "The requested endpoint was not found",
    },
    404,
  );
});

// Cloud Functions export
export default app;

// Node.js server for local development
if (import.meta.url === `file://${process.argv[1]}`) {
  import("@hono/node-server").then(({ serve }) => {
    logger.info(`🚀 Starting Swarm API server on port ${config.port}`);
    serve({
      fetch: app.fetch,
      port: config.port,
    });
  });
}
```

### 5.2 Update Webhook Routes
```typescript
// src/routes/webhook/index.ts
import { Hono } from "hono";
import { loadDebugConfig } from "../../config.js";
import { isDebugAuthenticated } from "../../services/auth.js";
import {
  handleCheckinWebhook,
  validateWebhookPayload,
} from "../../services/webhook.js";
import { logger } from "../../utils/logger.js";

const router = new Hono();
const config = loadDebugConfig();
const securityLogger = logger.getSubLogger({ name: "security" });

router.get("/health", (c) => {
  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    authentication: isDebugAuthenticated(config.debugFoursquareUserId) ? "active" : "inactive",
  });
});

router.post("/checkin", async (c) => {
  try {
    const contentType = c.req.header("content-type") || "";
    let rawPayload: unknown;

    if (contentType.includes("application/json")) {
      // JSON format
      rawPayload = await c.req.json();
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      // Form data format (Foursquare default)
      const formData = await c.req.formData();
      rawPayload = {
        user: JSON.parse(formData.get("user") as string),
        checkin: formData.get("checkin") as string,
        secret: formData.get("secret") as string,
      };
    } else {
      throw new Error(`Unsupported content type: ${contentType}`);
    }

    const payload = validateWebhookPayload(rawPayload);

    // Verify this is the authenticated debug user
    if (!isDebugAuthenticated(payload.user.id)) {
      securityLogger.warn('Unauthorized webhook attempt', {
        userId: payload.user.id,
        ip: c.req.header('cf-connecting-ip'),
      });
      return c.json({ success: false, message: "Unauthorized" }, 200);
    }

    const result = await handleCheckinWebhook(
      payload,
      config.discordWebhookUrl,
      config.foursquarePushSecret,
    );

    // Always return 200 OK for webhooks (Foursquare requirement)
    return c.json(result, 200);
  } catch (error) {
    logger.error("Webhook endpoint error:", error);

    // Always return 200 OK for webhooks, even on error
    return c.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      200,
    );
  }
});

export default router;
```

**Step 5 Completion:**
```bash
pnpm format
pnpm check:types
pnpm build
git add .
git commit -m "feat: add main application with debug authentication integration"
```

## Step 6: Setup and Testing

### 6.1 Get Debug Credentials
1. Start local server: `pnpm dev`
2. Visit: `http://localhost:3000/auth/swarm/login`
3. Login to Foursquare and authorize app
4. Copy the displayed environment variables to `.env.local`
5. Restart server with debug authentication enabled

### 6.2 Configure Foursquare Push API
1. Go to [Foursquare Developer Console](https://foursquare.com/developers/apps)
2. Open your app settings
3. Set Push URL to: `https://your-tunnel-domain.com/webhook/checkin`
4. Set Push Secret to match your `FOURSQUARE_PUSH_SECRET`
5. Save settings

### 6.3 Test the Integration
1. Use tunneling service (ngrok, cloudflared, etc.) to expose local server
2. Perform a check-in on Swarm mobile app
3. Verify webhook receives data in server logs
4. Check Discord channel for notification

**Step 6 Completion:**
```bash
pnpm format
pnpm check:types
pnpm build
git add .
git commit -m "feat: complete debug user Push API integration with documentation"
```

## Implementation Order

1. **Step 1**: OAuth token acquisition (Get debug credentials)
2. **Step 2**: Core types and configuration
3. **Step 3**: Debug authentication service
4. **Step 4**: Verify existing services (Discord & Webhook - already implemented)
5. **Step 5**: Main application integration
6. **Step 6**: Setup and testing

**Goal Achieved**: Local environment receives specific user's check-in data via Foursquare Real-time Push API and forwards to Discord.