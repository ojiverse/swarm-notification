variable "project_id" {
  description = "The Google Cloud project ID"
  type        = string
}

variable "github_repository" {
  description = "GitHub repository in format 'owner/repo'"
  type        = string
}

variable "github_actions_roles" {
  description = "List of IAM roles to grant to GitHub Actions service account"
  type        = list(string)
  default = [
    "roles/artifactregistry.writer",
    "roles/run.admin",
    "roles/secretmanager.secretAccessor",
    "roles/storage.objectAdmin"
  ]
}