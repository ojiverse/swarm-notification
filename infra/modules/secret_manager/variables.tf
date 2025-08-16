variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "secrets" {
  description = "Map of secret names to their configurations"
  type = map(object({
    value       = string
    description = string
    use_dummy   = optional(bool, false)
    dummy_value = optional(string, "PLACEHOLDER_SET_VIA_CONSOLE")
  }))
}

variable "labels" {
  description = "Labels to apply to all secrets"
  type        = map(string)
  default     = {}
}

variable "cloud_run_service_account" {
  description = "The Cloud Run service account email that needs access to secrets"
  type        = string
}