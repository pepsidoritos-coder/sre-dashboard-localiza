variable "aws_region" {
  description = "Região AWS"
  type        = string
  default     = "us-east-1"
}

variable "project" {
  description = "Nome do projeto"
  type        = string
  default     = "localiza"
}

variable "environment" {
  description = "Ambiente (dev/staging/prod)"
  type        = string
  default     = "prod"
}

variable "vpc_cidr" {
  description = "CIDR block da VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "cluster_version" {
  description = "Versão do Kubernetes no EKS"
  type        = string
  default     = "1.29"
}
