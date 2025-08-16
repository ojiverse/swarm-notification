variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "service_name" {
  description = "The name of the service to monitor"
  type        = string
}

variable "enable_log_sink" {
  description = "Whether to create a log sink"
  type        = bool
  default     = false
}

variable "sink_name" {
  description = "The name of the log sink"
  type        = string
  default     = "cloud-run-logs"
}

variable "log_bucket_name" {
  description = "The name of the Cloud Storage bucket for log sink"
  type        = string
  default     = ""
}

variable "log_filter" {
  description = "The filter for the log sink"
  type        = string
  default     = "resource.type=\"cloud_run_revision\""
}

variable "enable_error_alerts" {
  description = "Whether to enable error rate alerts"
  type        = bool
  default     = true
}

variable "error_rate_threshold" {
  description = "Error rate threshold for alerts (errors per second)"
  type        = number
  default     = 0.1
}

variable "enable_latency_alerts" {
  description = "Whether to enable latency alerts"
  type        = bool
  default     = true
}

variable "latency_threshold_ms" {
  description = "Latency threshold for alerts (milliseconds)"
  type        = number
  default     = 5000
}

variable "notification_channels" {
  description = "List of notification channels for alerts"
  type        = list(string)
  default     = []
}