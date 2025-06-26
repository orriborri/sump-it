#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

NAMESPACE="sump-it"

echo -e "${YELLOW}🧹 Cleaning up Sump It Coffee App from Kubernetes${NC}"

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌ kubectl is not installed or not in PATH${NC}"
    exit 1
fi

# Delete all resources
echo -e "${YELLOW}🗑️ Deleting application resources...${NC}"
kubectl delete -f k8s/ --ignore-not-found=true

# Delete namespace (this will delete everything in it)
echo -e "${YELLOW}📦 Deleting namespace...${NC}"
kubectl delete namespace ${NAMESPACE} --ignore-not-found=true

echo -e "${GREEN}✅ Cleanup completed successfully!${NC}"
