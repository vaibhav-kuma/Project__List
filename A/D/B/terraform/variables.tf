variable "aws_region" {
  description = "AWS region to deploy infrastructure"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment (staging or production)"
  type        = string
  default     = "staging"
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

variable "redis_node_type" {
  description = "Elasticache Redis node type"
  type        = string
  default     = "cache.t4g.micro"
}
