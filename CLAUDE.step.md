# CLAUDE.step.md - Essential Implementation Steps

## Step 1: Add Missing Dependencies and Types

### 1.1 Add Hono and Zod to package.json
```bash
pnpm add -E hono@latest zod@latest
```

### 1.2 Create src/types.ts
**Core types and Zod schemas for validation**:
```typescript
import { z } from "zod"

// Zod Schemas
const WebhookPayloadSchema = z.object({
  user: z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string().optional(),
  }),
  checkin: z.string(),
  secret: z.string(),
})

const UserSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string().optional(),
})

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
})

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
})

const ConfigSchema = z.object({
  port: z.number(),
  foursquarePushSecret: z.string(),
  discordWebhookUrl: z.string().url(),
})

// Type exports
export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>
export type ParsedCheckin = z.infer<typeof ParsedCheckinSchema>
export type User = z.infer<typeof UserSchema>
export type Venue = z.infer<typeof VenueSchema>
export type Config = z.infer<typeof ConfigSchema>

// Schema exports for validation
export { WebhookPayloadSchema, ParsedCheckinSchema, ConfigSchema }

// Discord types (no validation needed for outgoing webhooks)
export type DiscordWebhookPayload = {
  readonly content?: string
  readonly embeds?: ReadonlyArray<DiscordEmbed>
}

export type DiscordEmbed = {
  readonly title?: string
  readonly description?: string
  readonly color?: number
  readonly timestamp?: string
  readonly fields?: ReadonlyArray<{
    readonly name: string
    readonly value: string
    readonly inline?: boolean
  }>
}
```

## Step 2: Environment Configuration

### 2.1 Create .env.example
```bash
# Foursquare
FOURSQUARE_PUSH_SECRET=your_push_secret_here

# Discord
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your_webhook_id/your_webhook_token

# Server
PORT=3000
NODE_ENV=development
```

### 2.2 Create src/config.ts
```typescript
import { ConfigSchema, type Config } from "./types.js"

function loadConfig(): Config {
  return ConfigSchema.parse({
    port: Number(process.env["PORT"]) || 3000,
    foursquarePushSecret: process.env["FOURSQUARE_PUSH_SECRET"],
    discordWebhookUrl: process.env["DISCORD_WEBHOOK_URL"],
  })
}

export { loadConfig }
```

**Step 1 Completion:**
```bash
pnpm format
pnpm check:types
pnpm build
git add .
git commit -m "feat: add dependencies and core type definitions with Zod validation"
```

## Step 2: Environment Configuration

### 2.1 Create .env.example
```bash
# Foursquare
FOURSQUARE_PUSH_SECRET=your_push_secret_here

# Discord
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your_webhook_id/your_webhook_token

# Server
PORT=3000
NODE_ENV=development
```

### 2.2 Create src/config.ts
```typescript
import { ConfigSchema, type Config } from "./types.js"

function loadConfig(): Config {
  return ConfigSchema.parse({
    port: Number(process.env["PORT"]) || 3000,
    foursquarePushSecret: process.env["FOURSQUARE_PUSH_SECRET"],
    discordWebhookUrl: process.env["DISCORD_WEBHOOK_URL"],
  })
}

export { loadConfig }
```

**Step 2 Completion:**
```bash
pnpm format
pnpm check:types
pnpm build
git add .
git commit -m "feat: add environment configuration with Zod validation"
```

## Step 3: Core Implementation

### 3.1 Create src/discord.ts
```typescript
function sendCheckinToDiscord(checkin: ParsedCheckin): Promise<boolean>
function createDiscordEmbed(checkin: ParsedCheckin): DiscordEmbed
function postToDiscordWebhook(payload: DiscordWebhookPayload): Promise<Response>
```

**Step 3.1 Completion:**
```bash
pnpm format
pnpm check:types
pnpm build
git add .
git commit -m "feat: add Discord webhook integration"
```

### 3.2 Create src/webhook.ts
```typescript
import { WebhookPayloadSchema, ParsedCheckinSchema, type WebhookPayload, type ParsedCheckin } from "./types.js"

function handleCheckinWebhook(payload: WebhookPayload): Promise<{ readonly success: boolean; readonly message: string }>

function validateWebhookPayload(payload: unknown): WebhookPayload {
  return WebhookPayloadSchema.parse(payload)
}

function parseCheckinData(checkinJson: string): ParsedCheckin {
  const parsed = JSON.parse(checkinJson)
  return ParsedCheckinSchema.parse(parsed)
}
```

**Step 3.2 Completion:**
```bash
pnpm format
pnpm check:types
pnpm build
git add .
git commit -m "feat: add webhook payload processing with validation"
```

### 3.3 Create src/index.ts (Main Hono App)
```typescript
// Routes:
app.post('/webhook/checkin', webhookHandler)
app.get('/webhook/health', healthHandler)
app.get('/', indexHandler)

// Cloud Functions export
export default app
```

**Step 3.3 Completion:**
```bash
pnpm format
pnpm check:types
pnpm build
git add .
git commit -m "feat: add main Hono application with routing"
```

## Step 4: Testing Setup

### 4.1 Create src/mock-webhook-sender.ts
```typescript
function sendMockCheckin(): Promise<Response>
function generateMockCheckinData(): WebhookPayload
```

**Step 4 Completion:**
```bash
pnpm format
pnpm check:types
pnpm build
git add .
git commit -m "feat: add mock webhook sender for testing"
```

## Implementation Order

1. **Step 1**: Dependencies + Types (Foundation)
2. **Step 2**: Environment setup 
3. **Step 3.1**: Discord integration (Test with mock data)
4. **Step 3.2**: Webhook processing
5. **Step 3.3**: Main app (Connect everything)
6. **Step 4**: Mock testing tools

**Goal**: Minimal working webhook → Discord notification pipeline for Cloud Functions deployment.