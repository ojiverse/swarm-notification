resource "google_secret_manager_secret" "secrets" {
  for_each = var.secrets

  secret_id = each.key
  
  labels = var.labels

  replication {
    auto {}
  }
}

# Secret versions for dummy values (managed by Terraform)
resource "google_secret_manager_secret_version" "dummy_secret_versions" {
  for_each = { for k, v in var.secrets : k => v if v.use_dummy }

  secret      = google_secret_manager_secret.secrets[each.key].id
  secret_data = each.value.dummy_value
  
  lifecycle {
    ignore_changes = [secret_data]
  }
}

# Secret versions for real values (not managed by Terraform after initial creation)
resource "google_secret_manager_secret_version" "real_secret_versions" {
  for_each = { for k, v in var.secrets : k => v if !v.use_dummy }

  secret      = google_secret_manager_secret.secrets[each.key].id
  secret_data = each.value.value
}

resource "google_secret_manager_secret_iam_member" "cloud_run_access" {
  for_each = var.secrets

  project   = var.project_id
  secret_id = google_secret_manager_secret.secrets[each.key].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.cloud_run_service_account}"
}