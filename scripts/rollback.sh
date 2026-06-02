#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🔄 Initiating rollback...${NC}"

CURRENT_VERSION=$(docker inspect web-blue --format='{{.Config.Image}}')
PREVIOUS_VERSION="${ROLLBACK_VERSION:-${CURRENT_VERSION}}"

echo "Current version: $CURRENT_VERSION"
echo "Rolling back to: $PREVIOUS_VERSION"

docker stop web-green 2>/dev/null || true
docker rm web-green 2>/dev/null || true

docker run -d \
  --name web-green \
  --network saas-network \
  --env-file .env.production \
  "$PREVIOUS_VERSION"

sleep 10

MAX_RETRIES=20
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  HEALTH_STATUS=$(docker exec web-green curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health || echo "000")

  if [ "$HEALTH_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Previous version is healthy${NC}"
    break
  fi

  RETRY_COUNT=$((RETRY_COUNT + 1))
  sleep 5
done

docker exec nginx sh -c "
  sed -i 's/server web-blue:3000 weight=[0-9]*/server web-blue:3000 weight=0/' /etc/nginx/nginx.conf
  sed -i 's/server web-green:3000 weight=[0-9]*/server web-green:3000 weight=100/' /etc/nginx/nginx.conf
  nginx -s reload
"

docker stop web-blue 2>/dev/null || true
docker rm web-blue 2>/dev/null || true
docker rename web-green web-blue

docker exec nginx sh -c "
  sed -i 's/server web-green:3000 weight=[0-9]*/server web-blue:3000 weight=100/' /etc/nginx/nginx.conf
  nginx -s reload
"

echo -e "${GREEN}✅ Rollback completed successfully!${NC}"

if [ -n "$SLACK_WEBHOOK_URL" ]; then
  curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"⚠️ Rollback executed!\\nFrom: $CURRENT_VERSION\\nTo: $PREVIOUS_VERSION\"}" \
    "$SLACK_WEBHOOK_URL"
fi
