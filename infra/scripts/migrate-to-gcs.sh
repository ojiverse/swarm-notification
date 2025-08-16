#!/usr/bin/env bash
set -euo pipefail

# Script to migrate Terraform state from local to GCS backend

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BOOTSTRAP_DIR="${PROJECT_ROOT}/infra/bootstrap"
PRODUCTION_DIR="${PROJECT_ROOT}/infra/env/production"

echo "🚀 Starting Terraform state migration to GCS..."

# Check if bootstrap has been run
if [ ! -f "${BOOTSTRAP_DIR}/terraform.tfstate" ]; then
    echo "❌ Error: Bootstrap not found. Please run bootstrap first:"
    echo "   cd infra/bootstrap"
    echo "   terraform init"
    echo "   terraform apply"
    exit 1
fi

# Get bucket name from bootstrap state
cd "${BOOTSTRAP_DIR}"
BUCKET_NAME=$(terraform output -raw terraform_state_bucket)

if [ -z "${BUCKET_NAME}" ]; then
    echo "❌ Error: Could not get bucket name from bootstrap state"
    exit 1
fi

echo "📦 Found state bucket: ${BUCKET_NAME}"

# Update production backend configuration
cd "${PRODUCTION_DIR}"

# Create backup of current main.tf
cp main.tf main.tf.backup

# Update backend configuration in main.tf
sed -i.tmp "s|# backend \"gcs\" {|backend \"gcs\" {|g" main.tf
sed -i.tmp "s|#   bucket = \"YOUR_PROJECT_ID-terraform-state-SUFFIX\"|  bucket = \"${BUCKET_NAME}\"|g" main.tf
sed -i.tmp "s|#   prefix = \"env/production\"|  prefix = \"env/production\"|g" main.tf
sed -i.tmp "s|# }|}|g" main.tf

# Remove temporary file
rm -f main.tf.tmp

echo "✅ Updated backend configuration in main.tf"

# Initialize with new backend
echo "🔄 Reinitializing Terraform with GCS backend..."
terraform init -migrate-state

# Verify migration
echo "🔍 Verifying state migration..."
if terraform state list > /dev/null 2>&1; then
    echo "✅ State migration successful!"
    echo "📁 State is now stored in: gs://${BUCKET_NAME}/env/production/default.tfstate"
    
    # Clean up local state files
    if [ -f "terraform.tfstate" ]; then
        echo "🧹 Cleaning up local state files..."
        rm -f terraform.tfstate terraform.tfstate.backup
        echo "✅ Local state files removed"
    fi
else
    echo "❌ State migration failed!"
    echo "🔄 Restoring original configuration..."
    mv main.tf.backup main.tf
    exit 1
fi

# Remove backup file
rm -f main.tf.backup

echo ""
echo "🎉 Migration completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Commit the updated main.tf to version control"
echo "2. Share the bucket name with your team: ${BUCKET_NAME}"
echo "3. Team members should run 'terraform init' to use the remote state"
echo ""
echo "⚠️  Important:"
echo "- The bootstrap state is still stored locally in infra/bootstrap/"
echo "- Keep the bootstrap state safe as it manages the state bucket itself"
echo "- Consider backing up the bootstrap state to a secure location"