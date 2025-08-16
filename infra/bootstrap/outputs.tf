output "terraform_state_bucket" {
  description = "The name of the GCS bucket for Terraform state"
  value       = google_storage_bucket.terraform_state.name
}

output "terraform_service_account_email" {
  description = "The email of the Terraform service account"
  value       = google_service_account.terraform.email
}

output "backend_config" {
  description = "Backend configuration for Terraform"
  value = {
    bucket = google_storage_bucket.terraform_state.name
    prefix = "env/production"
  }
}

output "enabled_apis" {
  description = "List of enabled APIs"
  value       = keys(google_project_service.required_apis)
}