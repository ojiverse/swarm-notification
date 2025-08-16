variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region for resources"
  type        = string
  default     = "us-central1"
}

variable "image_url" {
  description = "The container image URL for Cloud Run"
  type        = string
}

# Note: All Foursquare and debug user configuration values are no longer variables
# These will be set manually via Google Cloud Console for enhanced security:
# - foursquare_client_id
# - foursquare_client_secret  
# - foursquare_push_secret
# - debug_foursquare_user_id
# - debug_access_token
# - discord_webhook_url

# Monitoring configuration
variable "notification_channels" {
  description = "List of notification channels for alerts"
  type        = list(string)
  default     = []
}

# Workload Identity management toggle
variable "manage_workload_identity" {
  description = "Whether to manage Workload Identity Federation resources (disabled in CI/CD)"
  type        = bool
  default     = true
}