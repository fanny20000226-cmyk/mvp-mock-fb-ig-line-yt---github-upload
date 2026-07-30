# Vercel deploy fallback

The production app is built from the `next-carcare` directory. If Vercel's native Git integration misses a GitHub push, the repository also includes a GitHub Actions fallback workflow:

`.github/workflows/vercel-deploy-hook.yml`

Required one-time GitHub secret:

`VERCEL_DEPLOY_HOOK_URL`

Set it to the current Vercel deploy hook URL for the `main` branch. After that, every push touching `next-carcare/**` triggers the Vercel deploy hook from GitHub Actions.

Keep the hook URL in GitHub Secrets instead of committing it into the repository.
