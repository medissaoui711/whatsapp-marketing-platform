#!/bin/bash
# scripts/pre-flight-check.sh
# الفحص النهائي قبل الإطلاق

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================="
echo "✈️  PRE-FLIGHT CHECK - PRODUCTION LAUNCH"
echo "========================================="

FAILED=0

# 1. فحص قاعدة البيانات
echo -n "📦 Checking PostgreSQL... "
if docker exec postgres pg_isready -U ${DB_USER} &>/dev/null; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAILED${NC}"
    FAILED=$((FAILED+1))
fi

# 2. فحص Redis
echo -n "⚡ Checking Redis... "
if docker exec redis redis-cli ping | grep -q "PONG"; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAILED${NC}"
    FAILED=$((FAILED+1))
fi

# 3. فحص Web (Blue)
echo -n "🌐 Checking Web (Blue)... "
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health | grep -q "200"; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAILED${NC}"
    FAILED=$((FAILED+1))
fi

# 4. فحص Worker
echo -n "👷 Checking Worker... "
if docker exec worker node -e "process.exit(0)" &>/dev/null; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAILED${NC}"
    FAILED=$((FAILED+1))
fi

# 5. فحص SSL (إذا كان منفذاً)
echo -n "🔐 Checking SSL... "
if openssl s_client -connect localhost:443 -servername api.scrapersaas.com 2>/dev/null | openssl x509 -noout -dates | grep -q "notAfter"; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${YELLOW}WARNING (SSL not configured locally)${NC}"
fi

# 6. فحص الـ Connection Pool
echo -n "🔄 Checking DB Connection Pool... "
POOL_SIZE=$(docker exec postgres psql -U ${DB_USER} -d ${DB_NAME} -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | tr -d ' ')
if [ "$POOL_SIZE" -lt 50 ]; then
    echo -e "${GREEN}OK ($POOL_SIZE connections)${NC}"
else
    echo -e "${YELLOW}WARNING ($POOL_SIZE connections)${NC}"
fi

# 7. فحص مساحة التخزين
echo -n "💾 Checking Storage... "
FREE_SPACE=$(df / | awk 'NR==2 {print $4}')
if [ "$FREE_SPACE" -gt 1073741824 ]; then  # 1GB
    echo -e "${GREEN}OK (${FREE_SPACE} bytes free)${NC}"
else
    echo -e "${RED}FAILED (Low storage)${NC}"
    FAILED=$((FAILED+1))
fi

echo "========================================="
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED - Ready for launch!${NC}"
    exit 0
else
    echo -e "${RED}❌ $FAILED checks failed - Please fix before launch${NC}"
    exit 1
fi
