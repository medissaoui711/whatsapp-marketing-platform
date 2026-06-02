# Operations Runbook - Scraper SaaS Platform

## Emergency Index

| Situation | Action | Response Time |
|-----------|--------|---------------|
| High CPU | Check workers, scale replicas | 5 min |
| Memory leak | Restart container, analyze heap | 10 min |
| Database failure | Activate standby, restore from backup | 15 min |
| WhatsApp API outage | Check token, re-authenticate | 5 min |
| Slow queries | Check slow query log, add index | 30 min |

## جهات الاتصال الطارئة

| الدور | المسؤول | الاتصال |
|--------|----------|----------|
| المهندس الرئيسي | Eng. Lead | +XXX XXX XXX |
| قائد الفريق | Team Lead | +XXX XXX XXX |
| دعم البنية التحتية | DevOps | +XXX XXX XXX |

## Preventive Checks

### Daily
- [ ] Review Grafana dashboard (CPU, Memory, Connections)
- [ ] Check Sentry errors
- [ ] Verify BullMQ queues are not backing up

### Weekly
- [ ] Review PostgreSQL slow query log
- [ ] Check SSL certificate expiry
- [ ] Inspect Redis memory usage

### Monthly
- [ ] Run `npm audit` for security updates
- [ ] Review authentication logs (failed login attempts)
- [ ] Create database backup

## Quick Commands

```bash
# Check all service health
docker-compose ps

# View live logs
docker-compose logs -f --tail=100

# Restart a specific service
docker-compose restart web-blue

# Enter container for diagnostics
docker exec -it web-blue /bin/sh

# Check BullMQ queue depth
docker exec redis redis-cli KEYS "bull*" | wc -l

# Manual SSL renewal
certbot renew --dry-run

# Check Prisma connection pool
curl -s http://localhost:3000/api/metrics | grep prisma_pool

# Database backup
docker exec postgres pg_dump -U $DB_USER $DB_NAME > backup_$(date +%Y%m%d).sql
```

## Deployment

```bash
# Full zero-downtime deploy
npm run deploy:production

# Rollback to previous version
npm run deploy:rollback

# Manual Docker build and push
docker build -t myapp-web:latest -f apps/web/Dockerfile .
docker tag myapp-web:latest ghcr.io/myorg/myapp-web:latest
docker push ghcr.io/myorg/myapp-web:latest
```

## Monitoring

- **Grafana**: http://localhost:3001 (admin / password from .env)
- **Prometheus**: http://localhost:9090
- **Sentry**: https://sentry.io (configured in `NEXT_PUBLIC_SENTRY_DSN`)
- **Health endpoint**: `GET /api/health` (unauthenticated)

## Recovery Procedures

### Database Recovery
```bash
# Stop web services to prevent writes
docker-compose stop web-blue web-green worker

# Restore from backup
cat backup_20260101.sql | docker exec -i postgres psql -U $DB_USER $DB_NAME

# Restart services
docker-compose start web-blue web-green worker
```

### Full System Restart
```bash
docker-compose down
docker-compose up -d
sleep 15
curl -f http://localhost:3000/api/health || docker-compose restart web-blue web-green
```
