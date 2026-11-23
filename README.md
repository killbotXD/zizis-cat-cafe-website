# Zizi's — Cat Café, Indiranagar

Static one-page website for Zizi's, hosted on GitHub Pages.

```
index.html            the whole site (HTML, CSS and JS in one file)
assets/img/           photos (placeholders for now: swap in real ones, same file names)
apps-script/Code.gs   backend for the contact form (lives in Google Apps Script, not served)
CNAME                 custom domain for GitHub Pages (add once the domain is decided)
```

## Publish on GitHub Pages

1. Repo **Settings → Pages → Build and deployment**: Source **Deploy from a branch**, branch **main**, folder **/ (root)**.
2. Under **Custom domain**, enter the domain. This writes/uses the `CNAME` file.
3. At the domain registrar, add DNS records:
   - Apex domain (`example.com`): four `A` records → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
     (optionally `AAAA` → `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`)
   - `www` subdomain: `CNAME` → `killbotxd.github.io`
4. Once the domain check turns green, tick **Enforce HTTPS**.

## Contact form → Google Sheet

The page posts to a Google Apps Script web app that appends rows to a private Google Sheet.
Bots are filtered by Cloudflare Turnstile (verified server-side) plus a hidden honeypot field.

1. Create a Google Sheet → **Extensions → Apps Script** → paste `apps-script/Code.gs`.
2. **Project Settings → Script properties**:
   - `TURNSTILE_SECRET` = Turnstile secret key (never commit this)
   - `ALLOWED_HOSTNAMES` = e.g. `example.com,www.example.com`
3. **Deploy → New deployment → Web app**: execute as *Me*, access *Anyone*. Copy the `/exec` URL.
4. In `index.html`, fill in `CONFIG.FORM_ENDPOINT` (the `/exec` URL) and `CONFIG.TURNSTILE_SITE_KEY` (the public site key).

After editing `Code.gs`, redeploy via **Deploy → Manage deployments → Edit → New version**. The URL stays the same.
