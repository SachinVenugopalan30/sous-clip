# Reverse Proxy Setup

Sous Clip listens on `127.0.0.1:3000` by default. To expose it on a subdomain with HTTPS, put it behind a reverse proxy.

## Nginx Proxy Manager

The easiest option if you already run other self-hosted apps.

### 1. DNS

Add an **A record** pointing your subdomain to your server's public IP:

```
recipes.yourdomain.com  →  A  →  203.0.113.10
```

### 2. Add a Proxy Host

In the Nginx Proxy Manager UI, click **Add Proxy Host** and fill in:

| Field | Value |
|---|---|
| Domain Names | `recipes.yourdomain.com` |
| Scheme | `http` |
| Forward Hostname / IP | `127.0.0.1` |
| Forward Port | `3000` |
| Websockets Support | **On** (required for live progress updates) |

### 3. SSL

Under the **SSL** tab:

- Select **Request a new SSL Certificate**
- Check **Force SSL**
- Check **HTTP/2 Support**
- Enter your email for Let's Encrypt
- Click **Save**

That's it. Open `https://recipes.yourdomain.com` and you should see the login page.

> **Note:** If Nginx Proxy Manager runs in Docker on the same host, you may need to use the host's Docker bridge IP (often `172.17.0.1`) or the container name instead of `127.0.0.1`, depending on your network setup. Test with `curl http://127.0.0.1:3000/health` from the NPM container to verify connectivity.
> **Note 2:** You may need to update the `docker-compose.yml` of Sous Clip to ensure that the `app` service is on the same Docker network as Nginx Proxy Manager if both are containerized. This allows you to use the container name (`sous-clip-app-1` in most cases) as the hostname in the proxy configuration.

---

## Nginx (manual config)

```nginx
server {
    listen 443 ssl http2;
    server_name recipes.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/recipes.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/recipes.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # SSE support (live progress updates)
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
    }
}

server {
    listen 80;
    server_name recipes.yourdomain.com;
    return 301 https://$host$request_uri;
}
```

Generate certificates with Certbot:

```bash
sudo certbot certonly --nginx -d recipes.yourdomain.com
```

---

## Caddy

```caddyfile
recipes.yourdomain.com {
    reverse_proxy 127.0.0.1:3000
}
```

Caddy handles HTTPS automatically — no extra configuration needed.

---

## Traefik (Docker labels)

Add these labels to the `app` service in `docker-compose.yml`:

```yaml
app:
  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.sousclip.rule=Host(`recipes.yourdomain.com`)"
    - "traefik.http.routers.sousclip.entrypoints=websecure"
    - "traefik.http.routers.sousclip.tls.certresolver=letsencrypt"
    - "traefik.http.services.sousclip.loadbalancer.server.port=3000"
```

Make sure the `app` service is on the same Docker network as Traefik.

---

## Important Notes

- **Websockets/SSE:** Sous Clip uses Server-Sent Events for live extraction progress. Make sure your proxy does not buffer responses (`proxy_buffering off` in Nginx, automatic in Caddy/Traefik).
- **Port binding:** The default `docker-compose.yml` binds to `127.0.0.1:3000`, which prevents direct external access. All traffic must go through the reverse proxy. If you need to expose the port directly (not recommended), change it to `"3000:3000"`.
- **Internal services:** Temporal and Valkey are only exposed internally between containers (`expose` instead of `ports`). Do not open these to the internet.
