output "secret_ids" {
  description = "Map of secret names to their secret IDs"
  value = {
    for name, secret in google_secret_manager_secret.secrets : name => secret.secret_id
  }
}

output "secret_names" {
  description = "Map of secret names to their full resource names"
  value = {
    for name, secret in google_secret_manager_secret.secrets : name => secret.name
  }
}