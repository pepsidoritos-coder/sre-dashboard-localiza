# ---- Karpenter IAM Role (IRSA) ----
resource "aws_iam_role" "karpenter" {
  name = "karpenter-controller-${var.cluster_name}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = var.irsa_oidc_provider_arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "${replace(var.irsa_oidc_provider_url, "https://", "")}:sub" = "system:serviceaccount:karpenter:karpenter"
          "${replace(var.irsa_oidc_provider_url, "https://", "")}:aud" = "sts.amazonaws.com"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "karpenter" {
  name = "karpenter-policy"
  role = aws_iam_role.karpenter.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ec2:CreateLaunchTemplate", "ec2:CreateFleet", "ec2:RunInstances",
                    "ec2:CreateTags", "ec2:TerminateInstances", "ec2:DescribeLaunchTemplates",
                    "ec2:DescribeInstances", "ec2:DescribeSecurityGroups", "ec2:DescribeSubnets",
                    "ec2:DescribeInstanceTypes", "ec2:DescribeInstanceTypeOfferings",
                    "ec2:DescribeAvailabilityZones", "ec2:DeleteLaunchTemplate",
                    "ec2:DescribeSpotPriceHistory"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["pricing:GetProducts"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["iam:PassRole"]
        Resource = "arn:aws:iam::*:role/${var.node_iam_role_name}"
      },
      {
        Effect   = "Allow"
        Action   = ["eks:DescribeCluster"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["ssm:GetParameter"]
        Resource = "arn:aws:ssm:*:*:parameter/aws/service/*"
      }
    ]
  })
}

# ---- Karpenter Helm Release ----
resource "helm_release" "karpenter" {
  namespace        = "karpenter"
  create_namespace = true
  name             = "karpenter"
  repository       = "oci://public.ecr.aws/karpenter"
  chart            = "karpenter"
  version          = "0.37.0"

  set {
    name  = "settings.clusterName"
    value = var.cluster_name
  }
  set {
    name  = "settings.clusterEndpoint"
    value = var.cluster_endpoint
  }
  set {
    name  = "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = aws_iam_role.karpenter.arn
  }
  set {
    name  = "controller.resources.requests.cpu"
    value = "250m"
  }
  set {
    name  = "controller.resources.requests.memory"
    value = "256Mi"
  }
}

output "karpenter_role_arn" { value = aws_iam_role.karpenter.arn }

variable "cluster_name"           {}
variable "cluster_endpoint"       {}
variable "irsa_oidc_provider_arn" {}
variable "irsa_oidc_provider_url" {}
variable "node_iam_role_name"     {}
