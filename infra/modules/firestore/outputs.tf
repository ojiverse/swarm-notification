output "database_name" {
  description = "The name of the Firestore database"
  value       = google_firestore_database.default.name
}

output "database_location" {
  description = "The location of the Firestore database"
  value       = google_firestore_database.default.location_id
}

output "api_enabled" {
  description = "Indicates that the Firestore API is enabled"
  value       = google_project_service.firestore.service
}