#!/usr/bin/env bash
set -euo pipefail

# Script to guide manual secret setting via Google Cloud Console

echo "🔐 Manual Secret Configuration Guide"
echo "======================================"
echo ""

# Get project ID
if [ -f "../env/production/terraform.tfvars" ]; then
    PROJECT_ID=$(grep "project_id" ../env/production/terraform.tfvars | cut -d'"' -f2)
else
    echo "⚠️  terraform.tfvars not found. Please set PROJECT_ID manually:"
    read -p "Enter your GCP project ID: " PROJECT_ID
fi

echo "📋 Project ID: ${PROJECT_ID}"
echo ""

# Secret names that need manual configuration
SECRETS=(
    "foursquare-client-id:Foursquare OAuth client ID"
    "foursquare-client-secret:Foursquare OAuth client secret"
    "foursquare-push-secret:Foursquare Push API secret for webhook validation"
    "debug-foursquare-user-id:Debug user's Foursquare user ID"
    "debug-access-token:Debug user's Foursquare access token"
    "discord-webhook-url:Discord webhook URL for notifications"
)

echo "🔧 Follow these steps to set secrets manually:"
echo ""

for secret_info in "${SECRETS[@]}"; do
    secret_name=$(echo "$secret_info" | cut -d':' -f1)
    description=$(echo "$secret_info" | cut -d':' -f2)
    
    echo "📝 Secret: ${secret_name}"
    echo "   Description: ${description}"
    echo "   Console URL: https://console.cloud.google.com/security/secret-manager/secret/${secret_name}/versions?project=${PROJECT_ID}"
    echo ""
    echo "   Steps:"
    echo "   1. Click 'NEW VERSION'"
    echo "   2. Paste your actual secret value"
    echo "   3. Click 'CREATE VERSION'"
    echo ""
done

echo "🔍 After setting all secrets, verify with:"
echo ""
echo "gcloud secrets versions list foursquare-client-id --project=${PROJECT_ID}"
echo "gcloud secrets versions list foursquare-client-secret --project=${PROJECT_ID}"
echo "gcloud secrets versions list foursquare-push-secret --project=${PROJECT_ID}"
echo "gcloud secrets versions list debug-foursquare-user-id --project=${PROJECT_ID}"
echo "gcloud secrets versions list debug-access-token --project=${PROJECT_ID}"
echo "gcloud secrets versions list discord-webhook-url --project=${PROJECT_ID}"
echo ""

echo "✅ Secret Values to Set:"
echo "========================"
echo ""
echo "foursquare-client-id:"
echo "  Your Foursquare OAuth client ID"
echo "  (found in Foursquare Developer Console > App settings)"
echo ""
echo "foursquare-client-secret:"
echo "  Your Foursquare OAuth client secret"
echo "  (found in Foursquare Developer Console > App settings)"
echo ""
echo "foursquare-push-secret:"
echo "  Your Foursquare Push API secret"
echo "  (found in Foursquare Developer Console > Push API settings)"
echo ""
echo "debug-foursquare-user-id:"
echo "  Your Foursquare user ID"
echo "  (obtained from /auth/swarm/login flow)"
echo ""
echo "debug-access-token:"
echo "  Your Foursquare access token from the OAuth flow"
echo "  (obtained from /auth/swarm/login)"
echo ""
echo "discord-webhook-url:"
echo "  Your Discord webhook URL"
echo "  Format: https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN"
echo ""

echo "⚠️  Security Notes:"
echo "- Never store these values in version control"
echo "- Only set actual values via Google Cloud Console"
echo "- Terraform will not overwrite manually set values"
echo "- These secrets are encrypted at rest in Secret Manager"