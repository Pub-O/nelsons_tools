# Project Instructions

- After code changes, deploy this project live on `ct-intra` using the GitHub repository as the source of truth.
- Preferred deployment flow: commit and push changes, then on `ct-intra` clone or pull `git@github.com:Pub-O/nelsons_tools.git` into `/home/dsamwald/pubo` and run `sh scripts/deploy-ct-intra-docker.sh`.
- Keep `/home/dsamwald/pubo/.env.ct-intra` on the host; do not replace it from local files.
