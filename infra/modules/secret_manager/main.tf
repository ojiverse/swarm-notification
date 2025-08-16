resource "google_secret_manager_secret" "secrets" {
  for_each = var.secrets

  secret_id = each.key
  
  labels = var.labels

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "secret_versions" {
  for_each = var.secrets

  secret      = google_secret_manager_secret.secrets[each.key].id
  secret_data = each.value.use_dummy ? each.value.dummy_value : each.value.value
  
  # Lifecycle rule to prevent Terraform from overwriting manually set values
  lifecycle {
    ignore_changes = each.value.use_dummy ? [secret_data] : []
  }
}

resource "google_secret_manager_secret_iam_member" "cloud_run_access" {
  for_each = var.secrets

  project   = var.project_id
  secret_id = google_secret_manager_secret.secrets[each.key].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.cloud_run_service_account}"
}