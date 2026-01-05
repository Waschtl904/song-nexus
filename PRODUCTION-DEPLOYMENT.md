# 🚀 SONG-NEXUS PRODUCTION DEPLOYMENT GUIDE

> **Complete step-by-step guide for deploying Song-Nexus to production**

**Version:** 1.0.0  
**Last Updated:** January 5, 2026  
**Status:** ✅ Production Ready

---

## 📋 Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Database Configuration](#database-configuration)
4. [Backend Deployment](#backend-deployment)
5. [Frontend Deployment](#frontend-deployment)
6. [SSL/TLS Certificates](#ssltls-certificates)
7. [Reverse Proxy Configuration](#reverse-proxy-configuration)
8. [Security Hardening](#security-hardening)
9. [Monitoring & Logging](#monitoring--logging)
10. [Rollback Procedures](#rollback-procedures)
11. [Troubleshooting](#troubleshooting)

---

## ✅ Pre-Deployment Checklist

### Code Quality
- [ ] All tests passing locally
- [ ] No console.log() statements in production code
- [ ] No hardcoded secrets or sensitive data
- [ ] No DEBUG_MODE or VERBOSE_LOGGING flags enabled
- [ ] Git history is clean (no temporary commits)

### Configuration
- [ ] `.env.production` created with real values (NOT .env.example)
- [ ] All required environment variables set
- [ ] JWT_SECRET is 32+ characters (use: `openssl rand -base64 32`)
- [ ] Database password is strong and secure
- [ ] PayPal credentials are LIVE (not sandbox)
- [ ] Frontend URL and API URLs match your domain

### Security
- [ ] SSL/TLS certificates obtained (Let's Encrypt recommended)
- [ ] CORS origins restricted to your domain only
- [ ] Database credentials stored securely (not in git)
- [ ] Rate limiting configured appropriately
- [ ] CSP headers configured
- [ ] HTTPS enforced (redirect HTTP → HTTPS)

### Infrastructure
- [ ] Server/VPS provisioned (2GB RAM minimum, 20GB storage)
- [ ] Node.js 18+ installed
- [ ] PostgreSQL 12+ installed and running
- [ ] Reverse proxy (Nginx/Apache) configured
- [ ] Firewall rules configured (ports 80, 443 only)
- [ ] SSH keys configured (no password login)

### Monitoring
- [ ] Error tracking service setup (Sentry, LogRocket)
- [ ] Performance monitoring enabled
- [ ] Log aggregation configured (if needed)
- [ ] Backup strategy in place
- [ ] Uptime monitoring configured

---

## 🔧 Environment Setup

### Step 1: Prepare Production Environment File

```bash
# On your local machine (NOT on server yet)
cd song-nexus/backend
cp .env.example .env.production

# Edit with your real production values
nano .env.production
```

**Required changes in .env.production:**

```env
NODE_ENV=production
HOST=0.0.0.0
PORT=3000
TRUST_PROXY=true

# Database (use RDS or managed PostgreSQL if possible)
DB_HOST=your-production-db-host.com
DB_PORT=5432
DB_NAME=song_nexus_prod
DB_USER=postgres
DB_PASSWORD=your-strong-db-password-32-chars
DB_SSL=true

# Generate with: openssl rand -base64 32
JWT_SECRET=your-random-32-char-secret
SESSION_SECRET=your-random-32-char-secret
COOKIE_SECRET=your-random-32-char-secret

# Your actual domain
FRONTEND_URL=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
WEBAUTHN_RP_ID=yourdomain.com
WEBAUTHN_ORIGIN=https://yourdomain.com

# PayPal LIVE credentials (not sandbox!)
PAYPAL_MODE=live
PAYPAL_CLIENT_ID=your-live-paypal-client-id
PAYPAL_CLIENT_SECRET=your-live-paypal-secret

# Logging
LOG_LEVEL=info
ENABLE_PERFORMANCE_MONITOR=true

# Security
HSTS_MAX_AGE=31536000
TRUST_PROXY=true
```

### Step 2: Generate Secure Secrets

```bash
# Generate secure random strings (32 characters base64)
openssl rand -base64 32  # JWT_SECRET
openssl rand -base64 32  # SESSION_SECRET
openssl rand -base64 32  # COOKIE_SECRET
openssl rand -base64 32  # DB_PASSWORD
```

**DO NOT commit .env.production to git!**

```bash
# Add to .gitignore (if not already there)
echo '.env.production' >> .gitignore
git add .gitignore
git commit -m "chore: prevent .env.production from being committed"
```

---

## 🗄️ Database Configuration

### Option A: Local PostgreSQL on VPS (Simple)

```bash
# SSH into your VPS
ssh user@your-server.com

# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo sudo -u postgres psql

# In PostgreSQL shell:
CREATE DATABASE song_nexus_prod;
CREATE USER song_nexus_user WITH PASSWORD 'your-strong-password';
ALTER ROLE song_nexus_user SET client_encoding TO 'utf8';
ALTER ROLE song_nexus_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE song_nexus_user SET default_transaction_deferrable TO on;
GRANT ALL PRIVILEGES ON DATABASE song_nexus_prod TO song_nexus_user;
\q

# Test connection
psql -h localhost -U song_nexus_user -d song_nexus_prod
```

### Option B: Managed Database (Recommended for Production)

**Amazon RDS:**
- Create PostgreSQL instance
- Set public accessibility if needed
- Create security group allowing your VPS
- Note: DB endpoint, port, username, password

**DigitalOcean Managed Database:**
- Create PostgreSQL cluster
- Add your VPS IP to trusted sources
- Copy connection string

### Initialize Database Schema

```bash
# Download schema from repository
wget https://raw.githubusercontent.com/Waschtl904/song-nexus/main/schema.sql

# Apply schema
psql -h your-db-host -U song_nexus_user -d song_nexus_prod -f schema.sql

# Verify tables created
psql -h your-db-host -U song_nexus_user -d song_nexus_prod -c '\dt'
```

### Setup Database Backups

**Daily backup script:**

```bash
#!/bin/bash
# File: /home/user/backup-db.sh

BACKUP_DIR=/home/user/db-backups
DB_NAME=song_nexus_prod
DB_USER=song_nexus_user
DB_HOST=localhost

mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/backup_${TIMESTAMP}.sql.gz"

pg_dump -h $DB_HOST -U $DB_USER $DB_NAME | gzip > $BACKUP_FILE

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "✅ Backup completed: $BACKUP_FILE"
```

```bash
# Make executable
chmod +x /home/user/backup-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add line: 0 2 * * * /home/user/backup-db.sh
```

---

## 🚀 Backend Deployment

### Step 1: Clone Repository on Server

```bash
# SSH into VPS
ssh user@your-server.com

# Clone repository
git clone https://github.com/Waschtl904/song-nexus.git
cd song-nexus

# Create .env.production file
# Copy contents from your local .env.production
nano backend/.env.production
# Paste contents, save (Ctrl+O, Enter, Ctrl+X)
```

### Step 2: Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install --production
cd ..
```

### Step 3: Setup Application Directory

```bash
# Create necessary directories
mkdir -p backend/logs
mkdir -p backend/uploads
mkdir -p backend/public/audio
mkdir -p backend/certs

# Set proper permissions
chown -R user:user /home/user/song-nexus
chmod -R 755 /home/user/song-nexus
chmod -R 755 backend/logs backend/uploads backend/public
```

### Step 4: Configure SSL Certificates

**Install Let's Encrypt (Recommended):**

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Copy to backend certs folder
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem backend/certs/localhost.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem backend/certs/localhost-key.pem
sudo chown user:user backend/certs/*
```

**Auto-renewal:**

```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot installs auto-renewal cron job automatically
# Check with: sudo systemctl status certbot.timer
```

### Step 5: Start with PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Create PM2 ecosystem config
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'song-nexus-backend',
      script: './backend/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        PATH: process.env.PATH
      },
      error_file: './backend/logs/pm2-error.log',
      out_file: './backend/logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G'
    }
  ]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 startup
pm2 save
pm2 startup

# Test
pm2 logs song-nexus-backend
```

### Step 6: Verify Backend is Running

```bash
# Check if process is running
pm2 status

# Test API health check
curl https://localhost:3000/api/health || echo "API not responding"

# Check logs
pm2 logs song-nexus-backend | tail -50
```

---

## 📦 Frontend Deployment

### Step 1: Build Frontend

```bash
cd song-nexus/frontend

# Copy .env.example to .env.production
cp .env.example .env.production
nano .env.production
# Update: VITE_API_URL to https://yourdomain.com/api
#         VITE_ENVIRONMENT to production
#         Disable debug flags

# Build for production
npm run build

# Output in: frontend/dist/
```

### Step 2: Serve with Nginx

```bash
# Install Nginx
sudo apt install nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/song-nexus
```

**Nginx Configuration:**

```nginx
upstream backend {
    server localhost:3000;
    server localhost:3001;  # Second PM2 instance
}

server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Frontend Static Files
    location / {
        root /home/user/song-nexus/frontend/dist;
        try_files $uri $uri/ /index.html;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # API Proxy to Backend
    location /api/ {
        proxy_pass https://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # CORS handling
        proxy_set_header Access-Control-Allow-Origin *;
        proxy_set_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
    }
    
    # Audio Files Caching
    location /public/audio/ {
        proxy_pass https://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/song-nexus /etc/nginx/sites-enabled/

# Test nginx config
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

---

## 🔒 SSL/TLS Certificates

### Automatic Renewal with Certbot

```bash
# Status
sudo systemctl status certbot.timer

# Test renewal (doesn't actually renew, just checks)
sudo certbot renew --dry-run

# Manual renewal
sudo certbot renew
```

### Certificate Monitoring

```bash
#!/bin/bash
# File: /home/user/check-cert.sh

DOMAIN=yourdomain.com
CERT_FILE="/etc/letsencrypt/live/$DOMAIN/cert.pem"
WARN_DAYS=30

EXPIRY=$(openssl x509 -enddate -noout -in $CERT_FILE | cut -d= -f2)
EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
NOW_EPOCH=$(date +%s)
DAYS_LEFT=$(( ($EXPIRY_EPOCH - $NOW_EPOCH) / 86400 ))

if [ $DAYS_LEFT -lt $WARN_DAYS ]; then
    echo "⚠️  Certificate expires in $DAYS_LEFT days"
    # Send alert email
fi
```

```bash
# Add to crontab for weekly check
crontab -e
# 0 0 * * 0 /home/user/check-cert.sh
```

---

## 🌐 Reverse Proxy Configuration

See Nginx configuration above. Key points:

✅ **Frontend:** Serve from `/frontend/dist`  
✅ **API Routes:** Proxy to `localhost:3000`  
✅ **Audio Files:** Cache with long TTL  
✅ **HTTPS:** Enforce with redirect  
✅ **Security Headers:** Add HSTS, CSP, X-Frame-Options  

---

## 🛡️ Security Hardening

### Firewall Configuration

```bash
# UFW (Uncomplicated Firewall)
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp  # Only from localhost after proxy setup

# Restrict port 3000 to localhost only
sudo ufw allow from 127.0.0.1 to 127.0.0.1 port 3000
sudo ufw allow from ::1 to ::1 port 3000
```

### Database Security

```bash
# PostgreSQL: Only allow local connections
sudo nano /etc/postgresql/*/main/postgresql.conf
# Ensure: listen_addresses = 'localhost'

# Or restrict to VPS IP only
# listen_addresses = '127.0.0.1,192.0.2.1'
```

### Application Security

✅ Environment variables in `.env.production` (not in code)  
✅ Rate limiting enabled  
✅ CORS restricted to your domain  
✅ HTTPS enforced  
✅ CSP headers configured  
✅ No console.logs in production  
✅ Error tracking enabled (Sentry, LogRocket)  

---

## 📊 Monitoring & Logging

### Application Logs

```bash
# Real-time logs
pm2 logs song-nexus-backend

# Log files location
backend/logs/app.log           # Application logs
backend/logs/performance.log   # Performance metrics
backend/logs/pm2-error.log     # PM2 errors
backend/logs/pm2-out.log       # PM2 output
```

### Error Tracking Setup (Sentry)

```bash
# Create account at https://sentry.io/
# Get your DSN

# Update .env.production
VITE_SENTRY_DSN=your-sentry-dsn
VITE_SENTRY_ENVIRONMENT=production
```

### Performance Monitoring

```bash
# Built-in performance monitor logs to:
backend/logs/performance.log

# Check CPU/Memory usage
pm2 monit song-nexus-backend

# System stats
top -p $(pgrep -f "node.*server.js")
```

### Uptime Monitoring

Setup external monitoring service:
- **Uptime Robot** (free)
- **Pingdom**
- **StatusCake**

Monitor: `https://yourdomain.com/api/health`

---

## 🔄 Rollback Procedures

### Quick Rollback (Last 5 Minutes)

```bash
# If PM2 still has old version
pm2 restart song-nexus-backend

# Or switch to previous commit
git checkout HEAD~1
npm install
pm2 restart song-nexus-backend
```

### Full Rollback (Last Deployment)

```bash
# Revert to previous version
git revert HEAD
git push origin main

# Pull changes
cd /home/user/song-nexus
git pull origin main

# Reinstall dependencies
cd backend && npm install --production && cd ..

# Restart
pm2 restart song-nexus-backend
```

### Database Rollback

```bash
# Restore from backup
psql -h localhost -U song_nexus_user -d song_nexus_prod < /home/user/db-backups/backup_YYYYMMDD_HHMMSS.sql

# Verify
psql -h localhost -U song_nexus_user -d song_nexus_prod -c '\dt'
```

---

## 🐛 Troubleshooting

### Backend Not Starting

```bash
# Check logs
pm2 logs song-nexus-backend | tail -100

# Common issues:
# 1. Port 3000 already in use
lsof -i :3000
sudo kill -9 <PID>

# 2. Database connection failed
psql -h $DB_HOST -U $DB_USER -d song_nexus_prod -c 'SELECT NOW()'

# 3. Missing environment variables
cat backend/.env.production | grep -v '^#' | grep -v '^$'
```

### Frontend Not Loading

```bash
# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Test Nginx config
sudo nginx -t

# Check frontend build
ls -la frontend/dist/
```

### API Calls Failing

```bash
# Test API directly
curl -v https://localhost:3000/api/health

# Check CORS headers
curl -i -X OPTIONS https://yourdomain.com/api/tracks \
  -H "Origin: https://yourdomain.com" \
  -H "Access-Control-Request-Method: GET"

# Check firewall
sudo ufw status
```

### Certificate Issues

```bash
# Check certificate expiry
echo | openssl s_client -connect localhost:443 2>/dev/null | openssl x509 -noout -dates

# Verify certificate chain
openssl s_client -connect yourdomain.com:443 -showcerts

# Validate with Let's Encrypt
echo | openssl s_client -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -text
```

---

## 📞 Support & Resources

- **GitHub Issues:** [song-nexus/issues](https://github.com/Waschtl904/song-nexus/issues)
- **Node.js Docs:** [nodejs.org](https://nodejs.org)
- **PostgreSQL Docs:** [postgresql.org](https://postgresql.org)
- **Let's Encrypt:** [letsencrypt.org](https://letsencrypt.org)
- **Nginx Docs:** [nginx.org](https://nginx.org)

---

## 📝 Post-Deployment Checklist

- [ ] Application loads without errors
- [ ] All API endpoints responding
- [ ] Database connections stable
- [ ] HTTPS working and enforced
- [ ] Certificate is valid (no warnings)
- [ ] Email notifications sent (if enabled)
- [ ] Error tracking receiving events
- [ ] Backups running automatically
- [ ] Monitoring alerts configured
- [ ] DNS points to correct IP
- [ ] CDN configured (if using)
- [ ] Analytics tracking working

---

**🎉 Congratulations! Song-Nexus is now in production!**

**Keep monitoring logs and performance metrics regularly.**
