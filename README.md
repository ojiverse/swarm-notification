# Swarm API Real-time Integration

A real-time webhook service that receives Foursquare Swarm check-in notifications and forwards them to Discord. Supports multiple users with Discord OAuth authentication and Firestore user management.

## Features

- **Real-time Notifications**: Receives Foursquare Swarm check-ins via Push API webhooks
- **Multi-User Support**: Full Discord OAuth authentication with Firestore user management
- **Discord Integration**: Formats and sends rich Discord embeds with check-in details
- **Secure Authentication**: Discord OAuth + JWT sessions with server membership verification
- **User Account Linking**: Connect/manage Foursquare accounts per Discord user
- **Cloud-Native**: Deployed on Google Cloud Run with auto-scaling and Firestore
- **Type-Safe**: Built with TypeScript and Zod schema validation

## Tech Stack

- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Hono (lightweight web framework)
- **Database**: Google Cloud Firestore for user data
- **Authentication**: Discord OAuth + JWT with secure cookie sessions
- **Validation**: Zod schemas for type-safe data validation
- **Logging**: tslog with structured logging
- **Infrastructure**: Google Cloud Platform (Cloud Run, Firestore, Secret Manager, Artifact Registry)
- **Deployment**: Terraform for infrastructure as code

## Authentication Flow

1. **Discord Login**: Users authenticate via Discord OAuth (`/auth/discord/login`)
2. **JWT Session**: Secure HTTP-only cookie with 7-day expiration
3. **Server Verification**: Validates Discord server membership
4. **Foursquare Linking**: Optional Swarm account connection (`/auth/swarm/login`)
5. **Webhook Processing**: Multi-user check-in notifications based on Firestore user lookup

## API Endpoints

- `GET /auth/discord/login` - Start Discord OAuth
- `GET /auth/swarm/login` - Connect Foursquare account (requires auth)
- `GET /users/@me` - Get current user profile
- `POST /webhook/checkin` - Process Foursquare check-ins (webhook)
- `GET /webhook/health` - System health and multi-user status

## Quick Start

See [docs/DEVELOP.md](docs/DEVELOP.md) for detailed development setup instructions.

## Infrastructure

Deployed using Terraform with Google Cloud services. See `infra/` directory for configuration.

## LICENSE

MIT License, see [./LICENSE](./LICENSE)