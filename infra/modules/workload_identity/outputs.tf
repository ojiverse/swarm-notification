output "workload_identity_pool_id" {
  description = "The ID of the workload identity pool"
  value       = google_iam_workload_identity_pool.github_actions.name
}

output "workload_identity_provider_id" {
  description = "The ID of the workload identity provider"
  value       = google_iam_workload_identity_pool_provider.github_actions.name
}

output "service_account_email" {
  description = "The email of the GitHub Actions service account"
  value       = google_service_account.github_actions.email
}

output "github_secrets" {
  description = "Values to set as GitHub repository secrets"
  value = {
    GOOGLE_CLOUD_WIF_PROVIDER      = google_iam_workload_identity_pool_provider.github_actions.name
    GOOGLE_CLOUD_WIF_SERVICE_ACCOUNT = google_service_account.github_actions.email
  }
  sensitive = false
}