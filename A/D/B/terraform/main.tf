provider "aws" {
  region = var.aws_region
}

# --- VPC & Networking Setup ---
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = { Name = "ninor-vpc-${var.environment}" }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true
}

resource "aws_subnet" "private" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.2.0/24"
}

# --- Database Setup (Replacing SQLite for Production via Postgres) ---
resource "aws_db_instance" "postgres" {
  identifier           = "ninor-db-${var.environment}"
  allocated_storage    = 20
  engine               = "postgres"
  engine_version       = "15.4"
  instance_class       = "db.t4g.micro"
  username             = "ninor_admin"
  password             = var.db_password
  skip_final_snapshot  = false
  backup_retention_period = 7 # 7 days automated backups
  multi_az             = var.environment == "production" ? true : false
  publicly_accessible  = false
}

# --- Redis Caching Layer ---
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "ninor-redis-${var.environment}"
  engine               = "redis"
  node_type            = var.redis_node_type
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379
}

# --- Load Balancer (ALB) ---
resource "aws_lb" "main" {
  name               = "ninor-alb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  subnets            = [aws_subnet.public.id]
  enable_deletion_protection = var.environment == "production"

  # Web Application Firewall (WAF) integration goes here
}

# --- ECS Cluster for Fargate Containers ---
resource "aws_ecs_cluster" "ninor_cluster" {
  name = "ninor-ecs-${var.environment}"
  
  setting {
    name  = "containerInsights"
    value = "enabled" # Important for Datadog / CloudWatch monitoring
  }
}

# Note: Standard Task Definitions for `apps/api` and `apps/web` 
# would be managed via the CI/CD pipeline using ECR pushing 
# and automated immutable ECS service deployments.
