variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region for the state bucket"
  type        = string
  default     = "us-central1"
}