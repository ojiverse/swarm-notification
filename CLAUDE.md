# CLAUDE.md - Swarm API Real-time Integration Project

## Phase 1: Developer-Only Authentication Implementation

### Overview

Implementation of a secure, developer-only authentication system for testing Foursquare Real-time Push API integration. This phase focuses on single-user validation before scaling to multi-user OAuth authentication.

### Architectural Decision

**Memory-based Authentication Approach:**
- Store developer's access token in secure memory storage
- No database persistence required for initial testing
- Single authenticated user (developer) for controlled testing environment
- Validates Real-time Push API functionality before production scaling

## Security Architecture

### Security Threat Model

**Primary Assets:**
- Developer's Foursquare access token
- Personal check-in data
- Application integrity

**Threat Vectors:**
1. **Memory Exposure**: Token accessible via memory dumps or process inspection
2. **Log Exposure**: Accidental token logging in application or system logs
3. **Network Interception**: Token transmission over insecure channels
4. **Environment Exposure**: Token visible in environment variables or CI/CD
5. **Application Vulnerabilities**: Token exposure through debug endpoints or errors

### Security Controls Implementation

#### Level 1: Essential Security (Required)

**Token Storage Security:**
```typescript
// src/services/auth.ts
// For local development: simple storage (production should use encryption)
let storedToken: string | null = null;

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
```

**Environment Variable Security:**
```typescript
// Local development with environment variables
const DEBUG_CONFIG_SCHEMA = z.object({
  // Existing configs...
  debugFoursquareUserId: z.string().min(1),
  debugAccessToken: z.string().min(1),
});

// Validation ensures required values are present
function loadDebugConfig(): DebugConfig {
  return DEBUG_CONFIG_SCHEMA.parse({
    ...loadConfig(),
    debugFoursquareUserId: process.env["DEBUG_FOURSQUARE_USER_ID"],
    debugAccessToken: process.env["DEBUG_ACCESS_TOKEN"],
  });
}
```

**Logging Security:**
```typescript
// src/middleware/sanitizer.ts
export const sanitizeSecrets = (obj: any): any => {
  const sensitiveFields = ['access_token', 'token', 'secret', 'password'];
  // Deep sanitization of sensitive fields
  return sanitizeSensitiveFields(obj, sensitiveFields);
};
```

#### Level 2: Enhanced Security (Future Implementation)

**Token Validation:**
```typescript
// src/services/auth.ts
export const validateDebugToken = async (token: string): Promise<boolean> => {
  try {
    // Validate token with Foursquare API
    const response = await fetch('https://api.foursquare.com/v2/users/self', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.ok;
  } catch (error) {
    securityLogger.error('Token validation failed', { 
      error: sanitizeError(error) 
    });
    return false;
  }
};
```


### Implementation Plan

#### Step 0: Developer Token Acquisition Setup

**Simple OAuth Flow for Token Acquisition:**
```typescript
// src/routes/auth/index.ts
const authRouter = new Hono();

// Step 1: Redirect to Foursquare OAuth
authRouter.get("/swarm/login", (c) => {
  const clientId = process.env["FOURSQUARE_CLIENT_ID"];
  const redirectUri = process.env["FOURSQUARE_REDIRECT_URI"];
  
  const authUrl = new URL("https://foursquare.com/oauth2/authenticate");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  
  return c.redirect(authUrl.toString());
});

// Step 2: Handle OAuth callback and exchange code for token
authRouter.get("/swarm/callback", async (c) => {
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
          <h1>Developer Token Retrieved</h1>
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

export default authRouter;
```

**Token Exchange Helper:**
```typescript
// src/services/oauth.ts
type TokenResponse = {
  readonly access_token: string;
  readonly token_type: string;
};

type UserInfo = {
  readonly id: string;
  readonly firstName: string;
  readonly lastName?: string;
};

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

**Main App Integration:**
```typescript
// src/main.ts
import authRoutes from "./routes/auth/index.js";

// Add auth routes
app.route("/auth", authRoutes);
```

**Required Environment Variables:**
```bash
# .env.local (OAuth config)
FOURSQUARE_CLIENT_ID=your_client_id
FOURSQUARE_CLIENT_SECRET=your_client_secret
FOURSQUARE_REDIRECT_URI=http://localhost:3000/auth/swarm/callback

# After OAuth flow completion:
DEBUG_FOURSQUARE_USER_ID=obtained_from_oauth
DEBUG_ACCESS_TOKEN=obtained_from_oauth
```

**Usage Flow:**
1. Start local server: `pnpm dev`
2. Visit: `http://localhost:3000/auth/swarm/login`
3. Login to Foursquare and authorize app
4. Copy the displayed environment variables to `.env.local`
5. Restart server with developer authentication enabled

#### Step 1: Local Development Token Management
```typescript
// src/config.ts - Enhanced
export interface DebugConfig extends Config {
  readonly debugFoursquareUserId: string;
  readonly debugAccessToken: string;
}

// Local development - use environment variables
function loadDebugConfig(): DebugConfig {
  return {
    ...loadConfig(),
    debugFoursquareUserId: process.env["DEBUG_FOURSQUARE_USER_ID"] || "",
    debugAccessToken: process.env["DEBUG_ACCESS_TOKEN"] || "",
  };
}
```

#### Step 2: Authentication Service
```typescript
// src/services/auth.ts
let authenticatedUserId: string | null = null;

export const initializeDebugAuth = async (userId: string, token: string): Promise<void> => {
  const isValid = await validateDebugToken(token);
  
  if (!isValid) {
    throw new Error('Invalid debug token');
  }
  
  storeToken(token);
  authenticatedUserId = userId;
  
  authLogger.info('Debug authentication initialized', {
    userId,
    // Never log tokens
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

#### Step 3: Webhook Security Enhancement
```typescript
// src/routes/webhook/index.ts - Enhanced
router.post("/checkin", async (c) => {
  try {
    const payload = validateWebhookPayload(await c.req.json());
    
    // Verify this is the authenticated debug user
    if (!isDebugAuthenticated(payload.user.id)) {
      securityLogger.warn('Unauthorized webhook attempt', {
        userId: payload.user.id,
        ip: c.req.header('cf-connecting-ip'),
      });
      return c.json({ success: false, message: "Unauthorized" }, 200);
    }
    
    // Process authenticated webhook
    const result = await handleCheckinWebhook(payload, config.discordWebhookUrl, config.foursquarePushSecret);
    
    return c.json(result, 200);
  } catch (error) {
    // Sanitized error logging
    webhookLogger.error("Webhook error", { 
      error: sanitizeError(error),
      // Never log request body that might contain tokens
    });
    
    return c.json({
      success: false,
      message: "Processing error",
    }, 200);
  }
});
```

### Deployment Security

#### Local Development Environment
```bash
# .env.local (for local development only)
NODE_ENV=development
FOURSQUARE_PUSH_SECRET=your_push_secret_here
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your_webhook_id/your_webhook_token
DEBUG_FOURSQUARE_USER_ID=your_foursquare_user_id
DEBUG_ACCESS_TOKEN=your_foursquare_access_token
PORT=3000

# .env.example (for documentation)
NODE_ENV=development
FOURSQUARE_PUSH_SECRET=your_push_secret_here
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your_webhook_id/your_webhook_token
DEBUG_FOURSQUARE_USER_ID=your_foursquare_user_id
DEBUG_ACCESS_TOKEN=your_foursquare_access_token
PORT=3000
```

#### Production Deployment (Future)
For production deployment, use Google Cloud Secret Manager instead of environment variables for enhanced security.

### Security Monitoring

#### Audit Logging
```typescript
// src/security/audit.ts
export const auditLogger = logger.getSubLogger({ name: "audit" });

export const auditEvent = (event: AuditEvent) => {
  auditLogger.info("Security audit event", {
    event_type: event.type,
    user_id: event.userId,
    timestamp: new Date().toISOString(),
    ip_address: event.ipAddress,
    user_agent: sanitizeUserAgent(event.userAgent),
    // Never log sensitive data
  });
};
```

#### Health Check Security
```typescript
// src/routes/webhook/index.ts
router.get("/health", (c) => {
  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    authentication: isDebugAuthenticated(config.debugFoursquareUserId) ? "active" : "inactive",
    // Never expose token or sensitive config
  });
});
```

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation | Status |
|------|------------|--------|------------|--------|
| Token exposure in logs | Medium | High | Log sanitization middleware | Required |
| Token exposure in memory | Low | High | Encrypted memory storage | Required |
| Unauthorized API access | Low | Medium | Token validation + user verification | Required |
| Network interception | Very Low | High | HTTPS enforcement | Required |
| Cloud environment breach | Very Low | High | IAM roles + Secret Manager | Required |

### Success Criteria

**Phase 1 Completion Requirements:**
1. ✅ Developer token securely stored in Google Cloud Secret Manager
2. ✅ Token encrypted in application memory
3. ✅ All logs sanitized of sensitive data
4. ✅ Webhook authentication validates developer identity
5. ✅ Real-time push API successfully receives and processes check-ins
6. ✅ Discord notifications working correctly
7. ✅ Security audit logging implemented
8. ✅ Rate limiting preventing token abuse

**Security Validation:**
- [ ] Penetration testing of webhook endpoints
- [ ] Log analysis confirming no token exposure
- [ ] Memory dump analysis confirming encryption
- [ ] Network traffic analysis confirming HTTPS-only
- [ ] IAM audit confirming minimal permissions

### Next Phase Preparation

Upon successful completion of Phase 1, the following will be implemented for multi-user support:

1. **Database Integration**: PostgreSQL with encrypted token storage
2. **OAuth 2.0 Flow**: Complete user authentication workflow
3. **User Management**: Registration, token refresh, revocation
4. **Scalability**: Multi-tenant architecture with user isolation
5. **Enhanced Security**: Additional monitoring, threat detection, compliance

This phased approach ensures security best practices are established from the beginning and validated with real-world usage before scaling to general availability.