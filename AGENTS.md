# Project Instructions

- After code changes, deploy this project live on `ct-intra` using the GitHub repository as the source of truth.
- Preferred deployment flow: commit and push changes, then on `ct-intra` clone or pull `git@github.com:Pub-O/nelsons_tools.git` into `/home/dsamwald/pubo` and run `sh scripts/deploy-ct-intra-docker.sh`.
- Keep `/home/dsamwald/pubo/.env.ct-intra` on the host; do not replace it from local files.
- A Cloudflare tunnel runs on Docker. Treat `https://int.app.pub-o.com` as the public app URL, `https://int.dash.pub-o.com` as the public admin dashboard URL, and `https://int.api.pub-o.com` as the public API URL. Docker-side origins are `pubo_web:8080` for app/dashboard and `pubo_api:4000` for API.
- `ct-prod` is reachable from the local machine through `ct-intra`: first SSH to `ct-intra`, then SSH from there to `192.168.10.100`.
- Direct `ProxyJump`/stdio forwarding through `ct-intra` is currently blocked, so use the nested form when needed: `ssh -A ct-intra 'ssh 192.168.10.100 "<command>"'`.
