# Manual Deployment Guide

## Prerequisites

1. **Google Cloud CLI installed and configured**
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **Terraform installed** (version >= 1.0)
   ```bash
   terraform --version
   ```

3. **Docker installed**
   ```bash
   docker --version
   ```

## Initial Setup (One-time Bootstrap)

### 1. Create Terraform State Backend

Before deploying the main infrastructure, we need to create a GCS bucket for Terraform state management.

```bash
# Navigate to bootstrap directory
cd infra/bootstrap

# Copy and configure variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your project_id

# Initialize and apply bootstrap
terraform init
terraform plan
terraform apply
```

This creates:
- Enables all required Google Cloud APIs
- GCS bucket for Terraform state storage
- Service account for Terraform operations
- Necessary IAM permissions

### 2. Migrate to Remote State

```bash
# Run the migration script from project root
./infra/scripts/migrate-to-gcs.sh
```

This script:
- Updates backend configuration in production environment
- Migrates local state to GCS
- Cleans up local state files

## Deployment Steps

### 1. Configure Terraform Variables

```bash
cd infra/env/production
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your actual values:
- `project_id`: Your GCP project ID
- `region`: GCP region (default: us-central1)
- `image_url`: Container image URL (update after building and pushing)

Example `terraform.tfvars`:
```hcl
project_id = "my-swarm-project-123"
region     = "us-central1"  
image_url  = "us-central1-docker.pkg.dev/my-swarm-project-123/swarm-api/swarm-api:latest"
```

**Note**: All application secrets are managed via Google Cloud Console for enhanced security. None are configured through Terraform variables.

### 2. Initialize Terraform

```bash
cd infra/env/production
terraform init
```

Note: If you've completed the bootstrap process, Terraform will automatically use the GCS backend.

### 3. Plan Infrastructure

```bash
terraform plan
```

Review the planned changes carefully.

### 4. Create Base Infrastructure

Create the foundational infrastructure (Artifact Registry, Secret Manager, monitoring):

```bash
terraform apply -target=module.artifact_registry -target=module.secret_manager -target=module.logging
```

### 5. Build and Push Container Image

```bash
# Go back to project root
cd ../../../

# Get the Artifact Registry URL from Terraform output
REGISTRY_URL=$(cd infra/env/production && terraform output -raw artifact_registry_url)

# Configure Docker authentication
gcloud auth configure-docker us-central1-docker.pkg.dev

# Build the image
docker build -t swarm-api .

# Tag the image
docker tag swarm-api $REGISTRY_URL/swarm-api:latest

# Push the image
docker push $REGISTRY_URL/swarm-api:latest
```

### 6. Update Terraform Variables

Update `terraform.tfvars` with the actual image URL:
```bash
# Edit the file
image_url = "us-central1-docker.pkg.dev/YOUR_PROJECT_ID/swarm-api/swarm-api:latest"
```

### 7. Set Secrets Manually via Google Cloud Console

**IMPORTANT**: Set all secrets before deploying Cloud Run, as the service will fail to start without them.

```bash
# Run the guided setup script
./infra/scripts/set-secrets-manual.sh
```

Or set them directly in the Google Cloud Console:

1. **Navigate to Secret Manager**: https://console.cloud.google.com/security/secret-manager
2. **Set the following secrets by creating new versions**:
   - `foursquare-client-id`: Your Foursquare OAuth client ID
   - `foursquare-client-secret`: Your Foursquare OAuth client secret
   - `foursquare-push-secret`: Your Foursquare Push API secret
   - `debug-foursquare-user-id`: Your Foursquare user ID
   - `debug-access-token`: Your Foursquare access token
   - `discord-webhook-url`: Your Discord webhook URL

### 8. Deploy Complete Infrastructure

Now deploy the complete infrastructure including Cloud Run:

```bash
cd infra/env/production

# Deploy everything
terraform apply
```

### 9. Verify Deployment

```bash
# Get the service URL
SERVICE_URL=$(terraform output -raw service_url)

# Test health endpoint
curl $SERVICE_URL/webhook/health

# Expected response:
# {"status":"healthy","timestamp":"...","authentication":"active"}
```

### 10. Update Foursquare Push API Settings

1. Go to [Foursquare Developer Console](https://foursquare.com/developers/apps)
2. Select your app
3. Navigate to Push API settings
4. Update **Push URL** to: `{SERVICE_URL}/webhook/checkin`
5. Save settings

## Updating the Application

### 1. Build and Push New Image

```bash
# Build new version
docker build -t swarm-api .

# Tag with new version
docker tag swarm-api $REGISTRY_URL/swarm-api:v1.1.0
docker tag swarm-api $REGISTRY_URL/swarm-api:latest

# Push both tags
docker push $REGISTRY_URL/swarm-api:v1.1.0
docker push $REGISTRY_URL/swarm-api:latest
```

### 2. Update Cloud Run Service

```bash
cd infra/env/production

# Terraform will detect the new image and update the service
terraform apply
```

## Monitoring and Debugging

### View Logs

```bash
# Cloud Run logs
gcloud logs read "resource.type=cloud_run_revision" --limit=50

# Filter by service
gcloud logs read "resource.type=cloud_run_revision AND resource.labels.service_name=swarm-api" --limit=50
```

### Check Service Status

```bash
# Service status
gcloud run services describe swarm-api --region=us-central1

# Recent revisions
gcloud run revisions list --service=swarm-api --region=us-central1
```

### View Secrets

```bash
# List secrets
gcloud secrets list

# View secret versions (not values)
gcloud secrets versions list debug-access-token
```

## Troubleshooting

### Common Issues

1. **Container build fails**
   - Check Dockerfile syntax
   - Ensure all dependencies are properly installed
   - Verify TypeScript compilation succeeds locally

2. **Cloud Run deployment fails**
   - Check image exists in Artifact Registry
   - Verify service account permissions
   - Check Cloud Run service logs

3. **Authentication not working**
   - Verify secrets are properly set
   - Check service account has Secret Manager access
   - Ensure environment variables are correctly configured

4. **Webhook not receiving requests**
   - Verify Foursquare Push API URL is correct
   - Check Cloud Run service is publicly accessible
   - Ensure webhook endpoint responds correctly

### Cleanup

To destroy all infrastructure:

```bash
cd infra/env/production
terraform destroy
```

**Warning**: This will delete all resources including secrets. Make sure to backup any important data first.

## Security Notes

- **Never commit sensitive values**: All secrets are managed via Google Cloud Console
- **Terraform state security**: No sensitive data is stored in Terraform state
- **Rotate secrets periodically**: Update secret versions in Secret Manager
- **Monitor access logs**: Use Cloud Logging to track access patterns
- **Least privilege IAM**: Service accounts have minimal required permissions
- **Audit logging**: Enable audit logs for production environments
- **Secret Manager encryption**: All secrets are encrypted at rest automatically

## Important Security Reminders

1. **No secrets in code**: All application secrets are exclusively managed via Secret Manager
2. **GCS backend**: Terraform state is stored securely in Google Cloud Storage
3. **Manual secret management**: Use only Google Cloud Console to set actual secret values
4. **Version control safety**: Only `terraform.tfvars.example` files are committed