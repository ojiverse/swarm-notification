# Swarm API Real-time Integration

A real-time webhook service that receives Foursquare Swarm check-in notifications and forwards them to Discord.

## Features

- **Real-time Notifications**: Receives Foursquare Swarm check-ins via Push API webhooks
- **Discord Integration**: Formats and sends rich Discord embeds with check-in details
- **Secure Authentication**: OAuth 2.0 flow with debug-mode user verification
- **Cloud-Native**: Deployed on Google Cloud Run with auto-scaling
- **Type-Safe**: Built with TypeScript and Zod schema validation

## Tech Stack

- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Hono (lightweight web framework)
- **Validation**: Zod schemas
- **Logging**: tslog with structured logging
- **Infrastructure**: Google Cloud Platform (Cloud Run, Secret Manager, Artifact Registry)
- **Deployment**: Terraform for infrastructure as code

## Quick Start

See [docs/DEVELOP.md](docs/DEVELOP.md) for detailed development setup instructions.

## Infrastructure

Deployed using Terraform with Google Cloud services. See `infra/` directory for configuration.

## LICENSE

MIT License, see [./LICENSE](./LICENSE)