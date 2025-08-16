resource "google_artifact_registry_repository" "main" {
  location      = var.region
  repository_id = var.repository_name
  description   = var.description
  format        = "DOCKER"

  labels = var.labels
}

resource "google_artifact_registry_repository_iam_member" "cloud_run_access" {
  count = length(var.cloud_run_service_accounts)
  
  project    = var.project_id
  location   = google_artifact_registry_repository.main.location
  repository = google_artifact_registry_repository.main.name
  role       = "roles/artifactregistry.reader"
  member     = "serviceAccount:${var.cloud_run_service_accounts[count.index]}"
}