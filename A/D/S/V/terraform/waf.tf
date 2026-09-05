resource "aws_wafv2_web_acl" "main" {
  name        = "ninor-${var.environment}-waf"
  description = "WAF ACL for Ninor ${var.environment}"
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  # Rate limiting
  rule {
    name     = "rate-limit"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "ninorRateLimit"
      sampled_requests_enabled   = true
    }
  }

  # Block SQL injection
  rule {
    name     = "sql-injection"
    priority = 2

    action {
      block {}
    }

    statement {
      sql_injection_match_statement {
        field_to_match {
          query_string {}
        }
        text_transformations {
          priority = 1
          type     = "URL_DECODE"
        }
        text_transformations {
          priority = 2
          type     = "HTML_ENTITY_DECODE"
        }
        text_transformations {
          priority = 3
          type     = "LOWERCASE"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "ninorSQLInjection"
      sampled_requests_enabled   = true
    }
  }

  # Block XSS
  rule {
    name     = "xss"
    priority = 3

    action {
      block {}
    }

    statement {
      xss_match_statement {
        field_to_match {
          query_string {}
        }
        text_transformations {
          priority = 1
          type     = "URL_DECODE"
        }
        text_transformations {
          priority = 2
          type     = "HTML_ENTITY_DECODE"
        }
        text_transformations {
          priority = 3
          type     = "LOWERCASE"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "ninorXSS"
      sampled_requests_enabled   = true
    }
  }

  # Block known bad IPs (AWS managed)
  rule {
    name     = "aws-managed-ip-reputation"
    priority = 4

    action {
      block {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesAmazonIpReputationList"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "ninorIPReputation"
      sampled_requests_enabled   = true
    }
  }

  # Block common bot threats
  rule {
    name     = "aws-managed-bot-control"
    priority = 5

    action {
      block {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesBotControlRuleSet"
        vendor_name = "AWS"
        managed_rule_group_configs {
          aws_managed_rules_bot_control_rule_set {
            inspection_level = "COMMON"
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "ninorBotControl"
      sampled_requests_enabled   = true
    }
  }

  # Block bad HTTP headers
  rule {
    name     = "aws-managed-known-bad-inputs"
    priority = 6

    action {
      block {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "ninorBadInputs"
      sampled_requests_enabled   = true
    }
  }

  # Block IPs from high-risk countries (optional - adjust as needed)
  # rule {
  #   name     = "geo-block"
  #   priority = 7
  #   action {
  #     block {}
  #   }
  #   statement {
  #     geo_match_statement {
  #       country_codes = ["XX"]  # Add blocked country codes
  #     }
  #   }
  #   visibility_config { ... }
  # }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "ninorWAF"
    sampled_requests_enabled   = true
  }

  tags = { Name = "ninor-${var.environment}-waf" }
}

resource "aws_shield_protection" "main" {
  name         = "ninor-${var.environment}-shield"
  resource_arn = aws_cloudfront_distribution.main.arn
}
