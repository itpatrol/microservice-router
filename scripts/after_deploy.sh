#!/bin/sh

cd $ZENCI_DEPLOY_DIR


cat > $ZENCI_DEPLOY_DIR/.env <<_EOF

MONGO_URL="$MONGODB"
MONGO_TABLE="$MONGO_TABLE"
PORT=$PORT
PROXY_PORT=$PROXY_PORT
SCHEMA=$SCHEMA
SECURE_KEY=$SECURE_KEY
PIDFILE=$PIDFILE
WORKERS=$WORKERS

_EOF

npm update

# restart proxy.
npm run stop-proxy
npm run start-proxy

# restart admin.
npm run stop-admin
npm run start-admin
