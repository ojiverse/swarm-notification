variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region for the Cloud Run service"
  type        = string
}

variable "service_name" {
  description = "The name of the Cloud Run service"
  type        = string
}

variable "image_url" {
  description = "The container image URL"
  type        = string
}

variable "port" {
  description = "The port the container listens on"
  type        = number
  default     = 8080
}

variable "cpu_limit" {
  description = "CPU limit for the container"
  type        = string
  default     = "1"
}

variable "memory_limit" {
  description = "Memory limit for the container"
  type        = string
  default     = "512Mi"
}

variable "min_instances" {
  description = "Minimum number of instances"
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Maximum number of instances"
  type        = number
  default     = 10
}

variable "environment_variables" {
  description = "Environment variables for the container"
  type        = map(string)
  default     = {}
}

variable "secret_environment_variables" {
  description = "Secret environment variables for the container"
  type = map(object({
    secret_name = string
    version     = string
  }))
  default = {}
}

variable "labels" {
  description = "Labels to apply to the Cloud Run service"
  type        = map(string)
  default     = {}
}

variable "allow_unauthenticated" {
  description = "Whether to allow unauthenticated access to the service"
  type        = bool
  default     = true
}

variable "custom_domain" {
  description = "Custom domain for the Cloud Run service (optional)"
  type        = string
  default     = null
}