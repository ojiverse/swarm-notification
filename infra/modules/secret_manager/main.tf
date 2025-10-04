resource "google_secret_manager_secret" "secrets" {
  for_each = var.secrets

  secret_id = each.key
  
  labels = var.labels

  replication {
    auto {}
  }
}

# Note: Secret versions are NOT managed by Terraform.
# Secret containers are created, but values must be set manually via:
# gcloud secrets versions add SECRET_NAME --data-file=-
#
# This prevents Terraform from creating/destroying secret versions.

resource "google_secret_manager_secret_iam_member" "cloud_run_access" {
  for_each = var.secrets

  project   = var.project_id
  secret_id = google_secret_manager_secret.secrets[each.key].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.cloud_run_service_account}"
}