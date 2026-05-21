# Project Instructions

- After code changes, deploy this project live on `ct-intra` using the GitHub repository as the source of truth.
- Preferred deployment flow: commit and push changes, then on `ct-intra` clone or pull `git@github.com:Pub-O/nelsons_tools.git` into `/home/dsamwald/pubo` and run `sh scripts/deploy-ct-intra-docker.sh`.
- Keep `/home/dsamwald/pubo/.env.ct-intra` on the host; do not replace it from local files.
- A Cloudflare tunnel runs on Docker and routes `int-web.pub-o.com` to the `pubo_web` service. Treat `https://int-web.pub-o.com` as the public web URL for Pub-O; the Docker-side origin is `pubo_web:8080`.
- `ct-prod` is reachable from the local machine through `ct-intra`: first SSH to `ct-intra`, then SSH from there to `192.168.10.100`.
- Direct `ProxyJump`/stdio forwarding through `ct-intra` is currently blocked, so use the nested form when needed: `ssh -A ct-intra 'ssh 192.168.10.100 "<command>"'`.
