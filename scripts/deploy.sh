#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="sump-it"
IMAGE_TAG=${1:-latest}
REGISTRY=${REGISTRY:-ghcr.io/your-username}
IMAGE_NAME="sump-it"

echo -e "${GREEN}🚀 Deploying Sump It Coffee App to Kubernetes${NC}"
echo -e "${YELLOW}Namespace: ${NAMESPACE}${NC}"
echo -e "${YELLOW}Image: ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}${NC}"

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌ kubectl is not installed or not in PATH${NC}"
    exit 1
fi

# Check if we can connect to the cluster
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}❌ Cannot connect to Kubernetes cluster${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Connected to Kubernetes cluster${NC}"

# Create namespace if it doesn't exist
echo -e "${YELLOW}📦 Creating namespace...${NC}"
kubectl apply -f k8s/namespace.yaml

# Deploy PostgreSQL
echo -e "${YELLOW}🐘 Deploying PostgreSQL...${NC}"
kubectl apply -f k8s/postgres-configmap.yaml
kubectl apply -f k8s/postgres-secret.yaml
kubectl apply -f k8s/postgres-init-configmap.yaml
kubectl apply -f k8s/postgres-pvc.yaml
kubectl apply -f k8s/postgres-deployment.yaml
kubectl apply -f k8s/postgres-service.yaml

# Wait for PostgreSQL to be ready
echo -e "${YELLOW}⏳ Waiting for PostgreSQL to be ready...${NC}"
kubectl wait --for=condition=ready pod -l app=postgres -n ${NAMESPACE} --timeout=300s

# Deploy Application
echo -e "${YELLOW}🚀 Deploying application...${NC}"

# Update image in deployment
sed "s|ghcr.io/your-username/sump-it:latest|${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}|g" k8s/app-deployment.yaml | kubectl apply -f -

kubectl apply -f k8s/app-configmap.yaml
kubectl apply -f k8s/app-secret.yaml
kubectl apply -f k8s/app-service.yaml

# Wait for application to be ready
echo -e "${YELLOW}⏳ Waiting for application to be ready...${NC}"
kubectl wait --for=condition=ready pod -l app=sump-it-app -n ${NAMESPACE} --timeout=300s

# Deploy HPA
echo -e "${YELLOW}📈 Deploying Horizontal Pod Autoscaler...${NC}"
kubectl apply -f k8s/hpa.yaml

# Deploy Ingress (optional)
if [ -f "k8s/ingress.yaml" ]; then
    echo -e "${YELLOW}🌐 Deploying Ingress...${NC}"
    kubectl apply -f k8s/ingress.yaml
fi

# Deploy Network Policy (optional)
if [ -f "k8s/network-policy.yaml" ]; then
    echo -e "${YELLOW}🔒 Deploying Network Policy...${NC}"
    kubectl apply -f k8s/network-policy.yaml
fi

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"

# Show deployment status
echo -e "${YELLOW}📊 Deployment Status:${NC}"
kubectl get pods -n ${NAMESPACE}
kubectl get services -n ${NAMESPACE}

# Show application URL
if kubectl get ingress -n ${NAMESPACE} &> /dev/null; then
    echo -e "${GREEN}🌐 Application URL:${NC}"
    kubectl get ingress -n ${NAMESPACE}
else
    echo -e "${YELLOW}💡 To access the application, use port-forward:${NC}"
    echo -e "${YELLOW}   kubectl port-forward -n ${NAMESPACE} service/sump-it-service 3000:80${NC}"
fi

echo -e "${GREEN}🎉 Sump It Coffee App deployed successfully!${NC}"
