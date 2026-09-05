variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "private_subnet_cidrs" {
  description = "Private subnet CIDRs"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "public_subnet_cidrs" {
  description = "Public subnet CIDRs"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.medium"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage (GB)"
  type        = number
  default     = 100
}

variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t4g.small"
}

variable "domain_name" {
  description = "Primary domain name"
  type        = string
  default     = "ninor.app"
}

variable "api_domain_name" {
  description = "API subdomain"
  type        = string
  default     = "api.ninor.app"
}

variable "ws_domain_name" {
  description = "WebSocket subdomain"
  type        = string
  default     = "ws.ninor.app"
}

variable "eks_node_instance_types" {
  description = "EKS node instance types"
  type        = list(string)
  default     = ["t3.large", "t3.xlarge"]
}

variable "eks_desired_size" {
  description = "EKS desired node count"
  type        = number
  default     = 3
}

variable "eks_max_size" {
  description = "EKS max node count"
  type        = number
  default     = 10
}

variable "eks_min_size" {
  description = "EKS min node count"
  type        = number
  default     = 2
}

variable "db_password" {
  description = "RDS master password"
  type        = string
  sensitive   = true
}

variable "redis_password" {
  description = "ElastiCache Redis auth token"
  type        = string
  sensitive   = true
}
