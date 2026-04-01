# SRE Cloud Dashboard — [Acesse aqui](https://marvincoast.github.io/sre-dashboard-localiza/)

> Projeto portfolio desenvolvido por **Marvin Costa**  **SRE/Cloud Engineer**.

## 🏗️ Arquitetura - 

```
Internet → Akamai CDN/WAF → AWS ALB → EKS (Karpenter) → Pods Nginx
                                           ↓
                                      CloudWatch / SSM
```

## 🛠️ Stack Técnica

| Tecnologia | Uso no Projeto |
|---|---|
| **AWS EKS 1.29** | Cluster Kubernetes gerenciado |
| **Karpenter** | Auto scaling Spot + On-Demand |
| **Terraform** | IaC — VPC, EKS, IAM, ECR |
| **ALB Controller** | Ingress e TLS via ACM |
| **CloudWatch** | Logs e métricas do cluster |
| **IAM + IRSA** | Least privilege para pods |
| **GitHub Actions** | CI/CD multi-stage |
| **Docker + ECR** | Build e registry de imagem |

## 📁 Estrutura

```
.
├── app/               # Site HTML5 (SRE Dashboard)
│   ├── index.html
│   ├── style.css
│   ├── main.js
│   └── Dockerfile
├── terraform/         # Infraestrutura como código
│   ├── main.tf
│   ├── variables.tf
│   └── modules/
│       ├── vpc/       # VPC, subnets, NAT
│       ├── eks/       # Cluster, OIDC, IAM
│       └── karpenter/ # NodePool, IRSA, Helm
├── k8s/               # Manifestos Kubernetes
│   ├── deployment.yaml
│   ├── ingress.yaml   # ALB Ingress
│   ├── hpa.yaml
│   └── karpenter-nodepool.yaml
└── .github/workflows/
    └── deploy.yml     # Pipeline CI/CD
```

## 🚀 Deploy

### Pré-requisitos
- AWS CLI configurado (`aws configure`)
- Terraform >= 1.5
- kubectl
- Docker

### 1. Provisionar infraestrutura

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

### 2. Configurar kubectl

```bash
aws eks update-kubeconfig --name localiza-prod --region us-east-1
```

### 3. Deploy da aplicação

```bash
# Build e push manual
docker build -t <ECR_URL>/localiza-app:latest ./app
docker push <ECR_URL>/localiza-app:latest

# Aplicar manifestos
kubectl apply -f k8s/
kubectl rollout status deployment/localiza-app
```

### 4. Verificar acesso

```bash
kubectl get ingress localiza-app-ingress -n default
# Copie o endereço do ALB e acesse no browser
```

### CI/CD Automático

Configure os secrets no GitHub:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

Qualquer `git push` para `main` dispara o pipeline completo automaticamente.

## 📊 Features do Dashboard

- **Arquitetura AWS interativa** — diagrama animado com todos os componentes
- **Métricas ao vivo** — CPU, memória, RPS, error rate (simulado em tempo real)
- **Node table** — status de cada node com tipo Spot/On-Demand
- **Karpenter feed** — log de eventos de provisionamento em tempo real
- **Pipeline CI/CD** — visualização do deploy com log ao vivo
- **Stack de tecnologias** — nível de domínio por área

---

*Desenvolvido com Terraform, AWS EKS, Karpenter, GitHub Actions e HTML5 puro.*
