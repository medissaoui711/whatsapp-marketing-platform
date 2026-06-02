#!/bin/bash
set -e

DOMAIN="api.scrapersaas.com"
EMAIL="admin@scrapersaas.com"

echo "🔐 Setting up SSL certificates for $DOMAIN..."

apt-get update
apt-get install -y certbot python3-certbot-nginx

certbot --nginx \
  --non-interactive \
  --agree-tos \
  --email $EMAIL \
  --domains $DOMAIN \
  --redirect

systemctl enable certbot.timer
systemctl start certbot.timer

echo "✅ SSL certificates configured successfully!"
echo "🔄 Auto-renewal enabled (twice daily check)"
