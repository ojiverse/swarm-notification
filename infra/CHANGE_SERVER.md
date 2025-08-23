# Discord Server Change Guide

This guide explains how to change the target Discord server for Swarm notifications.

## Overview

The Swarm API uses two Discord-related configurations:
- **DISCORD_TARGET_SERVER_ID**: Server ID for authentication (stored in GitHub Secrets)
- **DISCORD_WEBHOOK_URL**: Webhook URL for posting notifications (stored in Secret Manager)

## Prerequisites

- GitHub CLI (`gh`) installed and authenticated
- Google Cloud CLI (`gcloud`) installed and configured
- Access to the target Discord server with webhook creation permissions

## Step 1: Update Discord Target Server ID

The Discord Target Server ID is managed via GitHub Secrets and used for user authentication.

```bash
# Update GitHub Secret with new server ID
gh secret set TF_VAR_discord_target_server_id --body "YOUR_NEW_SERVER_ID"

# Verify the secret was updated
gh secret list
```

## Step 2: Create New Discord Webhook

1. Go to your target Discord server
2. Navigate to Server Settings > Integrations > Webhooks
3. Click "New Webhook" or "Create Webhook"
4. Configure the webhook:
   - Name: "Swarm Notifications" (or preferred name)
   - Channel: Select target channel for notifications
   - Copy the webhook URL

## Step 3: Update Discord Webhook URL

The webhook URL is stored in Google Cloud Secret Manager.

```bash
# Update the webhook URL secret
echo "YOUR_NEW_WEBHOOK_URL" | gcloud secrets versions add discord-webhook-url --data-file=-

# Verify the secret was updated
gcloud secrets versions list discord-webhook-url
```

## Step 4: Deploy Changes

Deploy the configuration changes to update the running service.

### Option A: GitHub Actions Deployment (Recommended)

```bash
# Trigger deployment via GitHub Actions
gh workflow run deploy-backend.yml
```

### Option B: Manual Terraform Deployment

```bash
# Navigate to production environment
cd infra/env/production

# Apply Terraform changes
terraform apply
```

## Step 5: Verify Deployment

Check that the service is running with the new configuration.

```bash
# Get service URL from Terraform output
cd infra/env/production
SERVICE_URL=$(terraform output -raw service_url)

# Test health endpoint
curl "$SERVICE_URL/webhook/health"

# Expected response:
# {"status":"healthy","timestamp":"...","authentication":"active"}
```

## Step 6: Test Webhook Integration

1. Authenticate with Discord OAuth:
   - Visit: `{SERVICE_URL}/auth/discord/login`
   - Complete Discord OAuth flow
   - Ensure you're a member of the new target server

2. Link Foursquare account:
   - Visit: `{SERVICE_URL}/auth/swarm/login`
   - Complete Foursquare OAuth flow

3. Test with actual check-in:
   - Perform a Foursquare Swarm check-in
   - Verify notification appears in new Discord channel

## Rollback Procedure

If issues occur, you can rollback to previous configuration:

```bash
# Rollback Discord Target Server ID
gh secret set TF_VAR_discord_target_server_id --body "PREVIOUS_SERVER_ID"

# Rollback Discord Webhook URL
echo "PREVIOUS_WEBHOOK_URL" | gcloud secrets versions add discord-webhook-url --data-file=-

# Deploy rollback
gh workflow run deploy-backend.yml
```

## Verification Checklist

- [ ] GitHub Secret `TF_VAR_discord_target_server_id` updated
- [ ] Secret Manager `discord-webhook-url` updated with new webhook URL
- [ ] Deployment completed successfully
- [ ] Health endpoint responds correctly
- [ ] Discord OAuth authentication works with new server
- [ ] Test check-in produces notification in new Discord channel

## Troubleshooting

### Authentication Issues
- Verify the new Discord server ID is correct
- Ensure users are members of the new target server
- Check Discord OAuth application settings

### Webhook Delivery Issues
- Verify webhook URL is correct and active
- Check Discord channel permissions
- Review application logs for webhook errors

### Service Deployment Issues
- Check GitHub Actions workflow logs
- Verify Terraform apply completed successfully
- Review Cloud Run service logs

## Security Notes

- Never commit Discord server IDs or webhook URLs to version control
- Webhook URLs should be treated as sensitive information
- Regularly rotate webhook URLs if compromised
- Monitor Discord server membership for unauthorized access

## Support

For additional support:
1. Check application logs: `gcloud logs read "resource.type=cloud_run_revision" --limit=50`
2. Review GitHub Actions workflow runs
3. Verify Secret Manager and GitHub Secrets configuration