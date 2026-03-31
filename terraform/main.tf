terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }

  # Backend remoto — S3 + DynamoDB para locking
  backend "s3" {
    bucket         = "localiza-tfstate-bucket"
    key            = "sre-dashboard/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "localiza-tf-lock"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "localiza-sre-dashboard"
      Environment = var.environment
      ManagedBy   = "terraform"
      Owner       = "marvin-costa"
    }
  }
}

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
  token                  = data.aws_eks_cluster_auth.this.token
}

provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
    token                  = data.aws_eks_cluster_auth.this.token
  }
}

data "aws_eks_cluster_auth" "this" {
  name = module.eks.cluster_name
}

# ---- Modules ----

module "vpc" {
  source      = "./modules/vpc"
  project     = var.project
  environment = var.environment
  vpc_cidr    = var.vpc_cidr
}

module "eks" {
  source           = "./modules/eks"
  project          = var.project
  environment      = var.environment
  vpc_id           = module.vpc.vpc_id
  private_subnets  = module.vpc.private_subnets
  cluster_version  = var.cluster_version
}

module "karpenter" {
  source          = "./modules/karpenter"
  cluster_name    = module.eks.cluster_name
  cluster_endpoint = module.eks.cluster_endpoint
  irsa_oidc_provider_arn       = module.eks.oidc_provider_arn
  irsa_oidc_provider_url       = module.eks.oidc_provider_url
  node_iam_role_name           = module.eks.node_iam_role_name

  depends_on = [module.eks]
}

# ---- CloudWatch Log Group ----
resource "aws_cloudwatch_log_group" "eks" {
  name              = "/aws/eks/${var.project}-${var.environment}/cluster"
  retention_in_days = 30
}

# ---- ECR Repository ----
resource "aws_ecr_repository" "app" {
  name                 = "${var.project}-app"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

output "ecr_repository_url" {
  value = aws_ecr_repository.app.repository_url
}

output "cluster_name" {
  value = module.eks.cluster_name
}

output "cluster_endpoint" {
  value     = module.eks.cluster_endpoint
  sensitive = true
}
