# Deploy package — SeguTracker v12 ads

Sitio estático listo para subir a Hostinger (VPS o shared hosting).

## Contenido

```
deploy/
├── index.html         # Landing con los 3 videos
├── videos/
│   ├── SHORT.mp4      # 17.5s · 3.0 MB
│   ├── MID.mp4        # 34.5s · 5.5 MB
│   └── LONG.mp4       # 53.3s · 8.4 MB
└── README.md          # Este archivo
```

Total: ~17 MB. Carga rápida en cualquier hosting.

---

## Cómo desplegar en Hostinger

### Opción A — Hostinger VPS (con SSH)

```bash
# Desde tu máquina local
scp -r deploy/ root@TU_IP:/var/www/html/segutracker/

# Si usas Nginx, añade un server block:
sudo nano /etc/nginx/sites-available/segutracker
```

Contenido del server block:
```nginx
server {
    listen 80;
    server_name tu-dominio.com;
    root /var/www/html/segutracker;
    index index.html;

    location /videos/ {
        # Cache videos for a week
        add_header Cache-Control "public, max-age=604800";
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/segutracker /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### Opción B — Hostinger Shared Hosting (con File Manager)

1. Comprimir esta carpeta: `deploy.zip`
2. Entrar a `hpanel.hostinger.com` → **Archivos** → **File Manager**
3. Navegar a `public_html/` (o subdirectorio)
4. Subir `deploy.zip` → click derecho → **Extract**
5. Renombrar `deploy/index.html` a `public_html/index.html` o ajustar la URL

### Opción C — Hostinger Shared Hosting (con FTP)

```bash
# Desde tu máquina local con un cliente FTP (FileZilla, lftp, etc.)
# Servidor: ftp.tu-dominio.com (o el que te dio Hostinger)
# Usuario / pass: los de hPanel
# Subir contenido de deploy/ a /public_html/
```

---

## URLs esperadas tras el deploy

- `https://tu-dominio.com/` — landing con los 3 videos
- `https://tu-dominio.com/videos/SHORT.mp4` — descarga directa
- `https://tu-dominio.com/videos/MID.mp4`
- `https://tu-dominio.com/videos/LONG.mp4`

---

## Optimizaciones opcionales

- **CDN**: si tienes Cloudflare delante, los .mp4 se cachean en edge → carga global más rápida.
- **HTTPS**: usa Let's Encrypt (`certbot --nginx -d tu-dominio.com`).
- **HTTP/2**: añade `listen 443 ssl http2;` al server block.
- **Compresión de mp4**: ya van con `+faststart` para reproducir mientras descargan.
