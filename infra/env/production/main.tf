terraform {
  required_version = ">= 1.0"
  
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
  
  # GCS backend configuration (uncomment after bootstrap)
  backend "gcs" {
    bucket = "swarm-notifier-terraform-state-d629960d"
    prefix = "env/production"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

locals {
  common_labels = {
    environment = "production"
    project     = "swarm-api"
    managed_by  = "terraform"
  }
  
  service_name = "swarm-api"
}

# Artifact Registry
module "artifact_registry" {
  source = "../../modules/artifact_registry"
  
  project_id      = var.project_id
  region          = var.region
  repository_name = local.service_name
  description     = "Docker repository for Swarm API container images"
  labels          = local.common_labels
  
  cloud_run_service_accounts = [module.cloud_run.service_account_email]
}

# Secret Manager
module "secret_manager" {
  source = "../../modules/secret_manager"
  
  project_id = var.project_id
  labels     = local.common_labels
  
  secrets = {
    debug-access-token = {
      value       = "" # Not used when use_dummy = true
      description = "Debug user's Foursquare access token"
      use_dummy   = true
      dummy_value = "FOURSQUARE_DEBUG_TOKEN_SET_VIA_CONSOLE"
    }
    discord-webhook-url = {
      value       = "" # Not used when use_dummy = true
      description = "Discord webhook URL for notifications"
      use_dummy   = true
      dummy_value = "DISCORD_WEBHOOK_URL_SET_VIA_CONSOLE"
    }
    foursquare-push-secret = {
      value       = "" # Not used when use_dummy = true
      description = "Foursquare Push API secret for webhook validation"
      use_dummy   = true
      dummy_value = "FOURSQUARE_PUSH_SECRET_SET_VIA_CONSOLE"
    }
    foursquare-client-secret = {
      value       = "" # Not used when use_dummy = true
      description = "Foursquare OAuth client secret"
      use_dummy   = true
      dummy_value = "FOURSQUARE_CLIENT_SECRET_SET_VIA_CONSOLE"
    }
    foursquare-client-id = {
      value       = "" # Not used when use_dummy = true
      description = "Foursquare OAuth client ID"
      use_dummy   = true
      dummy_value = "FOURSQUARE_CLIENT_ID_SET_VIA_CONSOLE"
    }
    debug-foursquare-user-id = {
      value       = "" # Not used when use_dummy = true
      description = "Debug user's Foursquare user ID"
      use_dummy   = true
      dummy_value = "DEBUG_USER_ID_SET_VIA_CONSOLE"
    }
  }
  
  cloud_run_service_account = module.cloud_run.service_account_email
}

# Cloud Run
module "cloud_run" {
  source = "../../modules/cloud_run"
  
  project_id   = var.project_id
  region       = var.region
  service_name = local.service_name
  image_url    = var.image_url
  
  labels = local.common_labels
  
  environment_variables = {
    NODE_ENV                = "production"
    FOURSQUARE_REDIRECT_URI = "https://${local.service_name}-${random_id.suffix.hex}-uc.a.run.app/auth/swarm/callback"
  }
  
  secret_environment_variables = {
    DEBUG_ACCESS_TOKEN = {
      secret_name = module.secret_manager.secret_ids["debug-access-token"]
      version     = "latest"
    }
    DISCORD_WEBHOOK_URL = {
      secret_name = module.secret_manager.secret_ids["discord-webhook-url"]
      version     = "latest"
    }
    FOURSQUARE_PUSH_SECRET = {
      secret_name = module.secret_manager.secret_ids["foursquare-push-secret"]
      version     = "latest"
    }
    FOURSQUARE_CLIENT_SECRET = {
      secret_name = module.secret_manager.secret_ids["foursquare-client-secret"]
      version     = "latest"
    }
    FOURSQUARE_CLIENT_ID = {
      secret_name = module.secret_manager.secret_ids["foursquare-client-id"]
      version     = "latest"
    }
    DEBUG_FOURSQUARE_USER_ID = {
      secret_name = module.secret_manager.secret_ids["debug-foursquare-user-id"]
      version     = "latest"
    }
  }
  
  cpu_limit    = "1"
  memory_limit = "512Mi"
  
  min_instances = 0
  max_instances = 10
  
  allow_unauthenticated = true
}

# Workload Identity Federation for GitHub Actions
module "workload_identity" {
  source = "../../modules/workload_identity"
  
  project_id        = var.project_id
  github_repository = "ojiverse/swarm-notification"
  
  github_actions_roles = [
    "roles/artifactregistry.writer",
    "roles/run.admin", 
    "roles/secretmanager.secretAccessor",
    "roles/storage.objectAdmin"
  ]
}

# Logging and Monitoring
module "logging" {
  source = "../../modules/logging"
  
  project_id   = var.project_id
  service_name = local.service_name
  
  enable_error_alerts   = false
  error_rate_threshold  = 0.1
  
  enable_latency_alerts = false
  latency_threshold_ms  = 5000
  
  notification_channels = var.notification_channels
}

# Random suffix for unique service names
resource "random_id" "suffix" {
  byte_length = 4
}