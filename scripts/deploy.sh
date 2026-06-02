#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 Starting Zero-Downtime Deployment...${NC}"

DEPLOYMENT_ID="deploy_$(date +%Y%m%d_%H%M%S)"
WEB_IMAGE="${DOCKER_REGISTRY}/${DOCKER_IMAGE_NAME}-web:${GITHUB_SHA:-latest}"
WORKER_IMAGE="${DOCKER_REGISTRY}/${DOCKER_IMAGE_NAME}-worker:${GITHUB_SHA:-latest}"
BLUE_CONTAINER="web-blue"
GREEN_CONTAINER="web-green"

echo -e "${YELLOW}📋 Step 1: Validating Docker images...${NC}"

if ! docker pull "$WEB_IMAGE"; then
  echo -e "${RED}❌ Failed to pull web image${NC}"
  exit 1
fi

if ! docker pull "$WORKER_IMAGE"; then
  echo -e "${RED}❌ Failed to pull worker image${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Images validated${NC}"

echo -e "${YELLOW}🟢 Step 2: Starting Green environment...${NC}"

docker stop "$GREEN_CONTAINER" 2>/dev/null || true
docker rm "$GREEN_CONTAINER" 2>/dev/null || true

docker run -d \
  --name "$GREEN_CONTAINER" \
  --network saas-network \
  --env-file .env.production \
  -e "NODE_ENV=production" \
  -e "DEPLOYMENT_ID=$DEPLOYMENT_ID" \
  "$WEB_IMAGE"

sleep 10

echo -e "${GREEN}✅ Green environment started${NC}"

echo -e "${YELLOW}🩺 Step 3: Health check for Green environment...${NC}"

MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  HEALTH_STATUS=$(docker exec "$GREEN_CONTAINER" curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health || echo "000")

  if [ "$HEALTH_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Green environment is healthy (HTTP $HEALTH_STATUS)${NC}"
    break
  fi

  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "Waiting for green to be ready... ($RETRY_COUNT/$MAX_RETRIES)"
  sleep 5
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo -e "${RED}❌ Green environment health check failed${NC}"
  docker stop "$GREEN_CONTAINER"
  docker rm "$GREEN_CONTAINER"
  exit 1
fi

echo -e "${YELLOW}👷 Step 4: Updating Worker...${NC}"

docker stop worker 2>/dev/null || true
docker rm worker 2>/dev/null || true

docker run -d \
  --name worker \
  --network saas-network \
  --env-file .env.production \
  "$WORKER_IMAGE"

echo -e "${YELLOW}🔄 Step 5: Gradual traffic shift to Green...${NC}"

docker exec nginx nginx -s reload

for WEIGHT in 10 25 50 75 100; do
  echo "Shifting $WEIGHT% traffic to Green..."

  docker exec nginx sh -c "
    sed -i 's/server web-green:3000 weight=[0-9]*/server web-green:3000 weight=$WEIGHT/' /etc/nginx/nginx.conf
    nginx -s reload
  "

  sleep 30

  ERROR_RATE=$(docker exec nginx sh -c "grep -c 'upstream timed out' /var/log/nginx/error.log || echo 0")

  if [ "$ERROR_RATE" -gt 5 ]; then
    echo -e "${RED}❌ Error rate increased during shift! Rolling back...${NC}"
    docker exec nginx sh -c "
      sed -i 's/server web-green:3000 weight=[0-9]*/server web-green:3000 weight=0/' /etc/nginx/nginx.conf
      nginx -s reload
    "
    docker stop "$GREEN_CONTAINER"
    docker rm "$GREEN_CONTAINER"
    exit 1
  fi
done

echo -e "${GREEN}✅ All traffic shifted to Green${NC}"

echo -e "${YELLOW}🧹 Step 6: Cleaning up Blue environment...${NC}"

docker stop "$BLUE_CONTAINER" 2>/dev/null || true
docker rm "$BLUE_CONTAINER" 2>/dev/null || true

echo -e "${GREEN}✅ Blue environment removed${NC}"

echo -e "${YELLOW}🏷️ Step 7: Renaming Green to Blue...${NC}"

docker rename "$GREEN_CONTAINER" "$BLUE_CONTAINER"

docker exec nginx sh -c "
  sed -i 's/server web-green:3000 weight=[0-9]*/server web-blue:3000 weight=100/' /etc/nginx/nginx.conf
  nginx -s reload
"

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}🎉 New version is live: $WEB_IMAGE${NC}"

if [ -n "$SLACK_WEBHOOK_URL" ]; then
  curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"✅ Deployment successful!\\nVersion: ${GITHUB_SHA:-latest}\\nDeployment ID: $DEPLOYMENT_ID\"}" \
    "$SLACK_WEBHOOK_URL"
fi
