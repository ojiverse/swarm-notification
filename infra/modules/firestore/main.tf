resource "google_firestore_database" "default" {
  project     = var.project_id
  name        = "(default)"
  location_id = "us-central1"
  type        = "FIRESTORE_NATIVE"
}