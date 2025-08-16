terraform {
  required_version = ">= 1.0"
  
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Enable required APIs
resource "google_project_service" "required_apis" {
  for_each = toset([
    "cloudbuild.googleapis.com",         # Cloud Build (for CI/CD)
    "run.googleapis.com",                # Cloud Run
    "artifactregistry.googleapis.com",   # Artifact Registry
    "secretmanager.googleapis.com",      # Secret Manager
    "logging.googleapis.com",            # Cloud Logging
    "monitoring.googleapis.com",         # Cloud Monitoring
    "storage.googleapis.com",            # Cloud Storage (for state bucket)
    "cloudresourcemanager.googleapis.com", # Resource Manager
    "iam.googleapis.com",                # IAM
  ])
  
  project = var.project_id
  service = each.value
  
  # Don't disable services when destroying
  disable_dependent_services = false
  disable_on_destroy         = false
}

# Random suffix for unique bucket name
resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# GCS bucket for Terraform state
resource "google_storage_bucket" "terraform_state" {
  depends_on = [google_project_service.required_apis]
  name     = "${var.project_id}-terraform-state-${random_id.bucket_suffix.hex}"
  location = var.region
  
  # Prevent accidental deletion
  lifecycle {
    prevent_destroy = true
  }
  
  # Enable versioning
  versioning {
    enabled = true
  }
  
  # Uniform bucket-level access
  uniform_bucket_level_access = true
  
  # Encryption (Google-managed by default)
  # Remove encryption block to use Google-managed encryption
  
  # Lifecycle rules
  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type = "Delete"
    }
  }
  
  lifecycle_rule {
    condition {
      num_newer_versions = 10
    }
    action {
      type = "Delete"
    }
  }
  
  labels = {
    environment = "production"
    purpose     = "terraform-state"
    managed_by  = "terraform"
  }
}

# Service account for Terraform operations
resource "google_service_account" "terraform" {
  depends_on = [google_project_service.required_apis]
  account_id   = "terraform-sa"
  display_name = "Terraform Service Account"
  description  = "Service account for Terraform operations"
}

# Grant necessary permissions to Terraform service account
resource "google_project_iam_member" "terraform_permissions" {
  for_each = toset([
    "roles/editor",                    # Broad permissions for resource management
    "roles/storage.admin",             # Storage bucket management
    "roles/secretmanager.admin",       # Secret Manager operations
    "roles/run.admin",                 # Cloud Run operations
    "roles/artifactregistry.admin",    # Artifact Registry operations
    "roles/logging.admin",             # Logging operations
    "roles/monitoring.admin",          # Monitoring operations
    "roles/iam.serviceAccountAdmin",   # Service account management
    "roles/iam.serviceAccountUser",    # Service account usage
  ])
  
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.terraform.email}"
}

# Grant Terraform service account access to state bucket
resource "google_storage_bucket_iam_member" "terraform_state_access" {
  bucket = google_storage_bucket.terraform_state.name
  role   = "roles/storage.admin"
  member = "serviceAccount:${google_service_account.terraform.email}"
}