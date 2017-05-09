# microservice-router

[![Gitter](https://img.shields.io/gitter/room/microservice-framework/chat.svg?style=flat-square)](https://gitter.im/microservice-framework/chat)
[![npm](https://img.shields.io/npm/dt/@microservice-framework/microservice-router.svg?style=flat-square)](https://www.npmjs.com/~microservice-framework)
[![microservice-frame.work](https://img.shields.io/badge/online%20docs-200-green.svg?style=flat-square)](http://microservice-frame.work)

Proxy-Router for [microservice-framework](https://www.npmjs.com/~microservice-framework)

# Change Log
- 1.2.5 
  - built in explorer ![exloper](https://files.gitter.im/microservice-framework/chat/Quaa/Screen-Shot-2017-05-08-at-10.38.51-PM.png)

## Setup using mfw-cli

- Create `myproject` first:
  
  ```bash
  # mkdir myproject
  # cd myproject
  # mfw setup 
  ```

- Install router service
  ```bash
  # mfw install @microservice-framework/microservice-router --save
  ```
- Start service
  ```bash
  # mfw start all
  ```
- Configure NGINX to direct requests to router instances:

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
