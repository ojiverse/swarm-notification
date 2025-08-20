# Swarm API Real-time Integration - Development Knowledge Base

## Project Overview
This project implements a real-time webhook service that receives Foursquare Swarm check-in data via Real-time Push API and forwards notifications to Discord. Deployed on Google Cloud Run with full multi-user support, Discord OAuth authentication, and Firestore user management.

## Architecture & Technology Stack

### Core Technologies
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Hono (lightweight web framework)
- **Database**: Google Cloud Firestore for user data storage
- **Authentication**: Discord OAuth + JWT with secure cookie sessions
- **Validation**: Zod schemas for type-safe data validation
- **Logging**: tslog with structured logging
- **Infrastructure**: Google Cloud Platform (Cloud Run, Secret Manager, Artifact Registry, Firestore)

### Key Components
- **Webhook Handler**: `packages/backend/src/routes/webhook/index.ts` - Processes multi-user Foursquare push notifications
- **Authentication System**: 
  - `packages/backend/src/routes/auth/discord.ts` - Discord OAuth flow
  - `packages/backend/src/middleware/auth.ts` - JWT authentication middleware
  - `packages/backend/src/lib/jwt.ts` - JWT token management
- **User Management**: `packages/backend/src/repository/user.ts` - Firestore user data operations
- **Discord Integration**: `packages/backend/src/services/discord.ts` - Formats and sends Discord embeds
- **OAuth Flow**: `packages/backend/src/routes/auth/swarm.ts` - Handles Foursquare OAuth for user account linking

## Development Workflows

### Local Development Setup
1. Configure environment variables in `.env.local`
2. Start Firestore emulator (automatically configured for local development)
3. Authenticate via `/auth/discord/login` for Discord OAuth
4. Connect Foursquare account via `/auth/swarm/login`
5. Use tunneling service (Cloudflare Tunnel/ngrok) for external webhook access
6. Configure Foursquare Developer Console with tunnel URL
7. Test with actual Swarm check-ins

### Code Quality Commands
```bash
pnpm format          # Biome formatting
pnpm check:types     # TypeScript type checking
pnpm build          # Production build
pnpm dev            # Development server
```

### Deployment Process
1. Build Docker image: `gcloud builds submit --tag us-central1-docker.pkg.dev/swarm-notifier/swarm-api/swarm-notifier:latest .`
2. Deploy via Terraform: `cd infra/env/production && terraform apply`
3. Verify deployment: Check `/webhook/health` endpoint

## Security Implementation

### Current Security Model
- **Authentication**: Discord OAuth + JWT with secure HTTP-only cookies
- **User Management**: Firestore-based user profiles with Discord server membership verification
- **Session Security**: 7-day JWT expiration with Bearer token and cookie support
- **Webhook Verification**: Push secret validation and user lookup via Firestore
- **Input Validation**: Strict Zod schema validation across all endpoints
- **CSRF Protection**: OAuth state parameter validation
- **Security Logging**: Comprehensive security event logging without sensitive data exposure

### Security Considerations
- All webhook requests return 200 OK (Foursquare requirement)
- Unauthorized attempts logged with IP tracking
- No secrets in logs (sanitized logging)
- HTTPS required for production webhooks

## API Endpoints & Data Flow

### Authentication Endpoints
- `GET /auth/discord/login` - Initiates Discord OAuth flow
- `GET /auth/discord/callback` - Handles Discord OAuth callback and sets JWT session
- `GET /auth/swarm/login` - Initiates Foursquare OAuth flow (requires Discord authentication)
- `GET /auth/swarm/callback` - Handles Foursquare OAuth callback and links account

### User Management Endpoints
- `GET /users/@me` - Get current user profile and connection status

### Webhook Endpoints
- `POST /webhook/checkin` - Receives Foursquare check-in webhooks
- `GET /webhook/health` - Health check with authentication status

### Data Processing Flow
1. Webhook payload validation (`WebhookPayloadSchema`)
2. Push secret validation
3. Foursquare user ID lookup in Firestore
4. User authentication and Discord server verification
5. Check-in data parsing (`ParsedCheckinSchema`)
6. Discord embed formatting with user-specific data
7. Asynchronous Discord webhook delivery

## Infrastructure & Deployment

### Terraform Structure
- **Bootstrap**: `infra/bootstrap/` - GCS backend, basic resources
- **Modules**: `infra/modules/` - Reusable infrastructure components
- **Environment**: `infra/env/production/` - Production configuration

### Cloud Resources
- **Cloud Run**: Auto-scaling container service (1 vCPU, 512MB)
- **Firestore**: NoSQL database for user profiles and session data
- **Secret Manager**: Stores sensitive configuration (Discord client secret, JWT secret, etc.)
- **Artifact Registry**: Container image storage
- **Cloud Logging/Monitoring**: Observability stack with structured logging

### Cost Optimization
- Min instances: 0 (cold start acceptable)
- Pay-per-request pricing model
- Estimated cost: ~$1.11/month (debug phase)

## Current Implementation Status

### ✅ Completed Features
- **Multi-User Support**: Full Discord OAuth + Firestore user management
- **Authentication**: JWT-based session management with secure cookies
- **User Profiles**: Discord and Foursquare account linking per user
- **Database**: Production Firestore integration with comprehensive user schema
- **Security**: Webhook verification, CSRF protection, server membership validation

### 🚧 Partial Implementation
- **User Management API**: Profile viewing implemented, but missing logout and disconnect endpoints
- **Error Handling**: Basic retry mechanisms in place, needs enhancement

### Next Phase Development
- **User Settings**: Per-user notification preferences and Discord channel configuration
- **API Completeness**: Add missing endpoints (logout, disconnect Swarm account)
- **Rate Limiting**: Implement proper rate limiting for webhook endpoints
- **Enhanced Error Handling**: Improved retry mechanisms for Discord webhook failures
- **Monitoring**: Comprehensive health checks and alerting beyond current status endpoint
- **Testing**: Unit and integration test coverage
- **Admin Features**: User management and analytics dashboard

### Scaling Considerations
- **Performance**: Optimize for higher check-in volumes
- **Reliability**: Implement queue-based processing for webhook delivery
- **Security**: Enhanced authentication and authorization
- **Observability**: Distributed tracing and advanced monitoring

## Development Best Practices

### Code Standards
- Follow TDD approach with comprehensive test coverage
- Use TypeScript strict mode with proper type definitions
- Implement proper error boundaries and graceful degradation
- Maintain structured logging for debugging and monitoring

### Security Guidelines
- Never commit secrets or tokens to repository
- Validate all input data with Zod schemas
- Implement proper authentication for all protected endpoints
- Log security events without exposing sensitive information

### Infrastructure Guidelines
- Use Terraform for all infrastructure changes
- Implement proper secret rotation procedures
- Monitor resource usage and costs
- Maintain backup and disaster recovery procedures

## Troubleshooting Guide

### Common Issues
- **OAuth Flow**: Redirect URI mismatch in Foursquare Developer Console
- **Webhook Delivery**: Tunnel URL configuration or firewall issues
- **Authentication**: Missing environment variables or invalid tokens
- **Discord Integration**: Incorrect webhook URL or permissions

### Debugging Commands
```bash
# View application logs
gcloud logs read "resource.type=cloud_run_revision" --limit=50

# Check service status
gcloud run services describe swarm-api --region=us-central1

# Test endpoints
curl https://swarm-api-oj7mv2xyia-uc.a.run.app/webhook/health
```

## External Dependencies

### Foursquare API
- **OAuth Endpoint**: `https://foursquare.com/oauth2/authenticate`
- **Token Exchange**: `https://foursquare.com/oauth2/access_token`
- **User API**: `https://api.foursquare.com/v2/users/self`
- **Documentation**: https://docs.foursquare.com/developer/reference/real-time-view

### Discord API
- **Webhook Format**: Discord embed specification
- **Rate Limits**: Standard Discord webhook rate limiting
- **Documentation**: https://discord.com/developers/docs/resources/webhook

## Environment Configuration

### Required Environment Variables
```bash
# Discord OAuth Configuration
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_GUILD_ID=your_discord_server_id

# Foursquare OAuth Configuration
FOURSQUARE_CLIENT_ID=your_foursquare_client_id
FOURSQUARE_CLIENT_SECRET=your_foursquare_client_secret

# API Configuration
FOURSQUARE_PUSH_SECRET=your_push_secret
DISCORD_WEBHOOK_URL=your_discord_webhook_url
BASE_DOMAIN=https://your-domain.com

# Security
JWT_SECRET=your_jwt_secret_key

# Server Configuration
PORT=3000
NODE_ENV=development

# Firestore (auto-configured for production, emulator for development)
GOOGLE_CLOUD_PROJECT=swarm-notifier
```

### Production Secrets (Secret Manager)
- `DISCORD_CLIENT_SECRET`: Discord OAuth application secret
- `DISCORD_WEBHOOK_URL`: Discord webhook endpoint for notifications
- `FOURSQUARE_CLIENT_SECRET`: Foursquare OAuth application secret
- `FOURSQUARE_PUSH_SECRET`: Webhook signature verification
- `JWT_SECRET`: JWT signing key for session management