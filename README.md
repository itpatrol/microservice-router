# microservice-router
Ready to Microservice framework router.

Create .env file with example content:
```
MONGO_URL="mongodb://%%MONGO_HOST%%/%%MONGO_DATABASE%%%%MONGO_OPTION%%"
MONGO_TABLE="routes"

HOSTNAME="%%SERVER_IP%%"

PORT=3000
PROXY_PORT=3100

SCHEMA=service.json

SECURE_KEY=%%SECURE_KEY%%

PIDFILE=%%PIDS_DIR%%/microservice-router.pid
LOGFILE=%%LOGS_DIR%%/microservice-router.log

WORKERS=2
INTERVAL=30000

BASE_URL="http://%%API_WEB_URL%%/"

```
Please replace `%%NAME%%` with your values.


We suggest to setup nginx proxy to balance API requests:

```nginx
    upstream apiv1 {
        server api1.server.com:3100;
        server api2.server.com:3100;
    }
    upstream apiv1admin {
        server api1.server.com:3000;
        server api2.server.com:3000;
    }
    server {
        listen       443 ssl;
        server_name  my-server.com www.my-server.com;
	underscores_in_headers on;
	large_client_header_buffers 4 64k;
        ssl_certificate ssl/my-server.com.crt;
        ssl_certificate_key ssl/my-server.com.key;
        ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
        ssl_ciphers         HIGH:!aNULL:!MD5;


        location ~ /\.(svn|git|ht) { deny all; }

        location /api/v1/ {
          limit_conn                 conn_from_one_ip 20;
          proxy_pass                 http://apiv1/;
          proxy_connect_timeout      15m;
          proxy_send_timeout         15m;
          proxy_read_timeout         15m;
          proxy_set_header  Host       $host;
          proxy_set_header  X-Real-IP  $remote_addr;
          proxy_set_header  HTTP_X_FORWARDED_FOR  $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header Range "";
          proxy_buffers 8 16k;
          proxy_buffer_size 32k;
        }

        location /admin/api/v1/ {
          limit_conn                 conn_from_one_ip 20;
          proxy_pass                 http://apiv1admin/;
          proxy_connect_timeout      15m;
          proxy_send_timeout         15m;
          proxy_read_timeout         15m;
          proxy_set_header  Host       $host;
          proxy_set_header  X-Real-IP  $remote_addr;
          proxy_set_header  HTTP_X_FORWARDED_FOR  $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header Range "";
          proxy_buffers 8 16k;
          proxy_buffer_size 32k;
        }
    }
```

Based on this config:

BASE_URL="https://my-server.com/api/v1/"

Start up admin and proxy services:

```bash
npm run start-admin
npm run start-proxy
```

When you need to stop service:

```bash
npm run stop-admin
npm run stop-proxy
```

