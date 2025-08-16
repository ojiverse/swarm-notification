output "log_sink_name" {
  description = "The name of the created log sink"
  value       = var.enable_log_sink ? google_logging_project_sink.main[0].name : null
}

output "error_alert_policy_name" {
  description = "The name of the error rate alert policy"
  value       = var.enable_error_alerts ? google_monitoring_alert_policy.error_rate[0].name : null
}

output "latency_alert_policy_name" {
  description = "The name of the latency alert policy"
  value       = var.enable_latency_alerts ? google_monitoring_alert_policy.response_time[0].name : null
}