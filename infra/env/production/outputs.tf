output "service_url" {
  description = "The URL of the deployed Cloud Run service"
  value       = module.cloud_run.service_url
}

output "artifact_registry_url" {
  description = "The URL of the Artifact Registry repository"
  value       = module.artifact_registry.repository_url
}

output "service_account_email" {
  description = "The email of the Cloud Run service account"
  value       = module.cloud_run.service_account_email
}

output "secret_names" {
  description = "Map of secret names to their full resource names"
  value       = module.secret_manager.secret_names
  sensitive   = true
}

# Workload Identity outputs for GitHub Actions setup (when managed)
output "github_secrets" {
  description = "GitHub repository secrets for CI/CD authentication"
  value       = var.manage_workload_identity ? module.workload_identity[0].github_secrets : null
}

output "workload_identity_provider" {
  description = "Workload Identity Provider resource name"
  value       = var.manage_workload_identity ? module.workload_identity[0].workload_identity_provider_id : null
}

output "github_actions_service_account" {
  description = "GitHub Actions service account email"
  value       = var.manage_workload_identity ? module.workload_identity[0].service_account_email : null
}