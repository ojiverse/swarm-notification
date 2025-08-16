# Manual Deployment Guide

This guide explains how to manually deploy application changes to the Cloud Run service after making code modifications.

## Prerequisites

- Docker installed and configured
- Google Cloud CLI (`gcloud`) installed and authenticated
- Access to the `swarm-notifier` Google Cloud project
- Docker authentication configured for Artifact Registry

## Deployment Process

### 1. Build and Push Docker Image

From the project root directory:

```bash
# Build the Docker image using Cloud Build (recommended)
gcloud builds submit --tag us-central1-docker.pkg.dev/swarm-notifier/swarm-api/swarm-notifier:latest .

# Alternative: Build locally and push (if Docker daemon access available)
docker build -t us-central1-docker.pkg.dev/swarm-notifier/swarm-api/swarm-notifier:latest .
docker push us-central1-docker.pkg.dev/swarm-notifier/swarm-api/swarm-notifier:latest
```

### 2. Deploy to Cloud Run

After the image is successfully pushed to Artifact Registry, deploy using Terraform:

```bash
# Navigate to production environment
cd infra/env/production

# Apply Terraform configuration to deploy new image
terraform apply
```

The deployment will:
- Pull the latest image from Artifact Registry
- Create a new Cloud Run revision
- Route 100% traffic to the new revision
- Maintain zero-downtime deployment

### 3. Verify Deployment

Check the deployment status:

```bash
# Check service status
gcloud run services describe swarm-api --region=us-central1 --project=swarm-notifier

# View recent logs
gcloud logs read "resource.type=cloud_run_revision AND resource.labels.service_name=swarm-api" --limit=50 --project=swarm-notifier

# Test the service endpoint
curl https://swarm-api-oj7mv2xyia-uc.a.run.app/webhook/health
```

### 4. Rollback (if needed)

If the deployment fails or issues are detected:

```bash
# List revisions
gcloud run revisions list --service=swarm-api --region=us-central1 --project=swarm-notifier

# Rollback to previous revision
gcloud run services update-traffic swarm-api --to-revisions=PREVIOUS_REVISION=100 --region=us-central1 --project=swarm-notifier
```

## Docker Authentication Setup

If you encounter authentication errors when pushing to Artifact Registry:

```bash
# Configure Docker authentication
gcloud auth configure-docker us-central1-docker.pkg.dev

# For sudo Docker usage
sudo gcloud auth configure-docker us-central1-docker.pkg.dev
```

## Alternative: Direct Cloud Run Deployment

You can also deploy directly using `gcloud run deploy` (bypasses Terraform):

```bash
gcloud run deploy swarm-api \
  --image=us-central1-docker.pkg.dev/swarm-notifier/swarm-api/swarm-notifier:latest \
  --region=us-central1 \
  --project=swarm-notifier \
  --allow-unauthenticated
```

**Note**: Direct deployment may cause Terraform state drift. Always prefer Terraform for production deployments.

## Monitoring Deployment

- **Cloud Console**: https://console.cloud.google.com/run/detail/us-central1/swarm-api/revisions?project=swarm-notifier
- **Logs**: https://console.cloud.google.com/logs/query?project=swarm-notifier
- **Service URL**: https://swarm-api-oj7mv2xyia-uc.a.run.app

## Troubleshooting

### Build Failures
- Check Dockerfile syntax and dependencies
- Verify all required files are included (not in .dockerignore)
- Check Cloud Build logs for detailed error messages

### Deployment Failures
- Verify image exists in Artifact Registry
- Check Cloud Run service logs for startup errors
- Ensure all required environment variables are set in Secret Manager

### Service Not Responding
- Check if service is listening on correct port (8080)
- Verify health check endpoint `/webhook/health`
- Review application logs for runtime errors

### Authentication Issues
- Ensure service account has necessary permissions
- Verify Secret Manager values are properly configured
- Check IAM bindings for Cloud Run and Secret Manager access