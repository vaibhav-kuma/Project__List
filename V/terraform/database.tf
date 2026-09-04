resource "aws_security_group" "rds" {
  name        = "ninor-${var.environment}-rds"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  tags = { Name = "ninor-${var.environment}-rds-sg" }
}

resource "aws_db_subnet_group" "main" {
  name        = "ninor-${var.environment}-db-subnet-group"
  subnet_ids  = aws_subnet.private[*].id

  tags = { Name = "ninor-${var.environment}-db-subnet-group" }
}

resource "aws_db_instance" "main" {
  identifier     = "ninor-${var.environment}"
  engine         = "postgres"
  engine_version = "16.3"

  instance_class        = var.db_instance_class
  allocated_storage     = var.db_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true
  iops                  = 3000
  max_allocated_storage = 500

  db_name  = "ninor"
  username = "ninor"
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  backup_retention_period = 30
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:05:00-sun:06:00"

  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier = "ninor-${var.environment}-final"

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  performance_insights_enabled          = true
  performance_insights_retention_period = 7

  auto_minor_version_upgrade = true

  tags = { Name = "ninor-${var.environment}-db" }
}

resource "aws_db_instance" "replica" {
  count = 1

  identifier                 = "ninor-${var.environment}-replica-${count.index + 1}"
  replicate_source_db        = aws_db_instance.main.identifier
  instance_class             = var.db_instance_class
  storage_type               = "gp3"
  storage_encrypted          = true
  backup_retention_period    = 7
  backup_window              = "04:00-05:00"
  deletion_protection        = true
  skip_final_snapshot        = true
  performance_insights_enabled = true
  vpc_security_group_ids     = [aws_security_group.rds.id]

  tags = { Name = "ninor-${var.environment}-db-replica-${count.index + 1}" }
}

resource "aws_security_group" "elasticache" {
  name        = "ninor-${var.environment}-elasticache"
  description = "Security group for ElastiCache Redis"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  tags = { Name = "ninor-${var.environment}-elasticache-sg" }
}

resource "aws_elasticache_subnet_group" "main" {
  name        = "ninor-${var.environment}-redis-subnet-group"
  subnet_ids  = aws_subnet.private[*].id
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id          = "ninor-${var.environment}-redis"
  description                   = "Redis cluster for Ninor ${var.environment}"
  node_type                     = var.redis_node_type
  port                          = 6379
  parameter_group_name          = "default.redis7.cluster.on"
  engine_version                = "7.1"
  automatic_failover_enabled    = true
  multi_az_enabled              = true
  num_cache_clusters            = 3
  data_tiering_enabled          = false
  at_rest_encryption_enabled    = true
  transit_encryption_enabled    = true
  auth_token                    = var.redis_password
  subnet_group_name             = aws_elasticache_subnet_group.main.name
  security_group_ids            = [aws_security_group.elasticache.id]
  maintenance_window            = "sun:06:00-sun:07:00"
  snapshot_retention_limit      = 7
  snapshot_window               = "05:00-06:00"
  auto_minor_version_upgrade    = true

  tags = { Name = "ninor-${var.environment}-redis" }
}
