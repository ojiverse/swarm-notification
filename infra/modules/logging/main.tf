resource "google_logging_project_sink" "main" {
  count = var.enable_log_sink ? 1 : 0
  
  name        = var.sink_name
  destination = "storage.googleapis.com/${var.log_bucket_name}"
  
  filter = var.log_filter
  
  unique_writer_identity = true
}

resource "google_monitoring_alert_policy" "error_rate" {
  count = var.enable_error_alerts ? 1 : 0
  
  display_name = "${var.service_name} Error Rate Alert"
  combiner     = "OR"
  
  conditions {
    display_name = "Error rate too high"
    
    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.service_name}\" AND metric.type=\"run.googleapis.com/request_count\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = var.error_rate_threshold
      
      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }
  
  notification_channels = var.notification_channels
  
  alert_strategy {
    auto_close = "1800s"
  }
}

resource "google_monitoring_alert_policy" "response_time" {
  count = var.enable_latency_alerts ? 1 : 0
  
  display_name = "${var.service_name} Response Time Alert"
  combiner     = "OR"
  
  conditions {
    display_name = "Response time too high"
    
    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.service_name}\" AND metric.type=\"run.googleapis.com/request_latencies\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = var.latency_threshold_ms
      
      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_PERCENTILE_95"
      }
    }
  }
  
  notification_channels = var.notification_channels
  
  alert_strategy {
    auto_close = "1800s"
  }
}