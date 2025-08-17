output "service_url" {
  description = "The URL of the Cloud Run service"
  value       = google_cloud_run_v2_service.main.uri
}

output "service_name" {
  description = "The name of the Cloud Run service"
  value       = google_cloud_run_v2_service.main.name
}

output "service_account_email" {
  description = "The email of the Cloud Run service account"
  value       = google_service_account.cloud_run.email
}

output "custom_domain_url" {
  description = "The URL of the custom domain (if configured)"
  value       = var.custom_domain != null ? "https://${var.custom_domain}" : null
}