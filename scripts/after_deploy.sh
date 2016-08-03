#!/bin/sh

cd $ZENCI_DEPLOY_DIR

mkdir -p $DATASTORE
mkdir -p $CACHEDIR


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
npm stop-proxy
npm start-proxy

# restart admin.
npm stop-admin
npm start-admin
