output "repository_url" {
  description = "The URL of the created repository"
  value       = "${google_artifact_registry_repository.main.location}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.main.repository_id}"
}

output "repository_name" {
  description = "The name of the created repository"
  value       = google_artifact_registry_repository.main.name
}

output "repository_location" {
  description = "The location of the created repository"
  value       = google_artifact_registry_repository.main.location
}