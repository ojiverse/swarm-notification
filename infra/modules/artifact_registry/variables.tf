variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region for the repository"
  type        = string
}

variable "repository_name" {
  description = "The name of the Artifact Registry repository"
  type        = string
}

variable "description" {
  description = "The description of the repository"
  type        = string
  default     = "Docker repository for container images"
}

variable "labels" {
  description = "Labels to apply to the repository"
  type        = map(string)
  default     = {}
}

variable "cloud_run_service_accounts" {
  description = "List of Cloud Run service account emails that need access"
  type        = list(string)
  default     = []
}