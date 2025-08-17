# Firebase Emulator Configuration

This directory contains Firebase emulator configuration for local development using Docker.

## Files

- `Dockerfile` - Docker image for Firebase emulator with Java runtime
- `firebase.json` - Firebase emulator configuration
- `firestore.rules` - Firestore security rules (development-only)
- `firestore.indexes.json` - Firestore indexes configuration
- `.firebaserc` - Firebase project configuration

## Usage

### Start Emulator (Docker)
```bash
# From project root
pnpm dev:emulator
```

### Build Emulator Image
```bash
# From project root
pnpm dev:emulator:build
```

### Start Full Stack
```bash
# From project root
pnpm dev:full
```

## Access Points

- **Firestore UI**: http://localhost:4000
- **Firestore Emulator**: http://localhost:8081

## Environment Configuration

The backend application expects the following environment variable:
```bash
FIRESTORE_EMULATOR_HOST=localhost:8081
```

This is already configured in `packages/backend/.env.local`.

## Development Workflow

1. Start the Firebase emulator:
   ```bash
   pnpm dev:emulator
   ```

2. In another terminal, start the backend application:
   ```bash
   cd packages/backend
   pnpm dev
   ```

3. Access the Firestore UI at http://localhost:4000 to view and manage data.

## Security Rules

The current rules (`firestore.rules`) allow all read/write operations for development purposes. In production, proper security rules should be implemented.