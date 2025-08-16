# Swarm API Real-time Integration - Development Knowledge Base

## Project Overview
This project implements a real-time webhook service that receives Foursquare Swarm check-in data via Real-time Push API and forwards notifications to Discord. Currently deployed on Google Cloud Run with a debug-mode authentication system.

## Architecture & Technology Stack

### Core Technologies
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Hono (lightweight web framework)
- **Validation**: Zod schemas for type-safe data validation
- **Logging**: tslog with structured logging
- **Infrastructure**: Google Cloud Platform (Cloud Run, Secret Manager, Artifact Registry)

### Key Components
- **Webhook Handler**: `src/routes/webhook/index.ts` - Processes Foursquare push notifications
- **Authentication**: `src/services/auth.ts` - Debug-mode user authentication
- **Discord Integration**: `src/services/discord.ts` - Formats and sends Discord embeds
- **OAuth Flow**: `src/routes/auth/swarm.ts` - Handles Foursquare OAuth for token acquisition

## Development Workflows

### Local Development Setup
1. Configure environment variables in `.env.local`
2. Run OAuth flow via `/auth/swarm/login` to obtain debug tokens
3. Use tunneling service (Cloudflare Tunnel/ngrok) for external webhook access
4. Configure Foursquare Developer Console with tunnel URL
5. Test with actual Swarm check-ins

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
- **Authentication**: Single debug user ID verification
- **Token Storage**: In-memory access token storage
- **Webhook Verification**: Push secret validation
- **Input Validation**: Strict Zod schema validation
- **Security Logging**: Dedicated security event logging

### Security Considerations
- All webhook requests return 200 OK (Foursquare requirement)
- Unauthorized attempts logged with IP tracking
- No secrets in logs (sanitized logging)
- HTTPS required for production webhooks

## API Endpoints & Data Flow

### Authentication Endpoints
- `GET /auth/swarm/login` - Initiates OAuth flow
- `GET /auth/swarm/callback` - Handles OAuth callback and displays tokens

### Webhook Endpoints
- `POST /webhook/checkin` - Receives Foursquare check-in webhooks
- `GET /webhook/health` - Health check with authentication status

### Data Processing Flow
1. Webhook payload validation (`WebhookPayloadSchema`)
2. User authentication verification
3. Push secret validation
4. Check-in data parsing (`ParsedCheckinSchema`)
5. Discord embed formatting
6. Asynchronous Discord webhook delivery

## Infrastructure & Deployment

### Terraform Structure
- **Bootstrap**: `infra/bootstrap/` - GCS backend, basic resources
- **Modules**: `infra/modules/` - Reusable infrastructure components
- **Environment**: `infra/env/production/` - Production configuration

### Cloud Resources
- **Cloud Run**: Auto-scaling container service (1 vCPU, 512MB)
- **Secret Manager**: Stores sensitive configuration
- **Artifact Registry**: Container image storage
- **Cloud Logging/Monitoring**: Observability stack

### Cost Optimization
- Min instances: 0 (cold start acceptable)
- Pay-per-request pricing model
- Estimated cost: ~$1.11/month (debug phase)

## Future Development Roadmap

### Phase 2: Multi-User Support
- **Database**: Add Firestore for user token storage
- **Authentication**: Implement full OAuth session management
- **User Management**: Support multiple authenticated users
- **Settings**: Per-user notification preferences

### Technical Debt & Improvements
- **Error Handling**: Enhanced retry mechanisms for Discord webhook failures
- **Rate Limiting**: Implement proper rate limiting for webhook endpoints
- **Monitoring**: Add comprehensive health checks and alerting
- **Testing**: Unit and integration test coverage
- **Documentation**: API documentation and user guides

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
# OAuth Configuration
FOURSQUARE_CLIENT_ID=your_client_id
FOURSQUARE_CLIENT_SECRET=your_client_secret
FOURSQUARE_REDIRECT_URI=http://localhost:3000/auth/swarm/callback

# Push API Configuration
FOURSQUARE_PUSH_SECRET=your_push_secret
DISCORD_WEBHOOK_URL=your_discord_webhook_url

# Debug Authentication (obtained via OAuth flow)
DEBUG_FOURSQUARE_USER_ID=user_id
DEBUG_ACCESS_TOKEN=access_token

# Server Configuration
PORT=3000
NODE_ENV=development
```

### Production Secrets (Secret Manager)
- `DEBUG_ACCESS_TOKEN`: User access token
- `DISCORD_WEBHOOK_URL`: Discord webhook endpoint
- `FOURSQUARE_PUSH_SECRET`: Webhook signature verification