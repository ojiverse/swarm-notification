output "database_name" {
  description = "The name of the Firestore database"
  value       = google_firestore_database.default.name
}

output "database_location" {
  description = "The location of the Firestore database"
  value       = google_firestore_database.default.location_id
}