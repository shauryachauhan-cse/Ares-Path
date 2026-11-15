# Deploy Ares Path v11 to Vercel

This is an adapted copy of the uploaded ChatGPT Sites ZIP. The original is untouched.

## Fast deployment

1. Unzip this archive. **Upload the contents of the `ares-path-vercel` directory** (not the directory itself) into a new GitHub repository. At the GitHub repo root you should see `package.json`, `public/`, `worker/`, `scripts/`, `api/`, and `vercel.json`.
2. Visit https://vercel.com/new and import the GitHub repository.
3. Under Build and Output Settings, use **Framework Preset: Other**, **Build Command: npm run build**, **Output Directory: public**. The included `vercel.json` also specifies these settings.
4. Click Deploy. If Vercel asks for a Node version, use Node 22.x.
5. On the deployed site, test `/`, `/api/health`, the Mars route planner, the estimator, and the rover energy simulation.

## What works and what needs extra setup

- Frontend code, map files, imagery, science layers and model assets are included.
- `/api/routes`, `/api/estimate`, `/api/energy`, `/api/intelligence`, `/api/health` run in Vercel Node serverless functions using the original calculations.
- The original `ChatGPT Sites` version used Cloudflare R2 `BUCKET` and platform-injected `oai-authenticated-user-id` for **saved missions**. Those services do not carry over. The Vercel adapter deliberately removes the untrusted identity header and leaves `/api/missions` saving and listing unavailable until secure authentication + storage are implemented. Do not claim saved missions work on Vercel.
- This is a migration adapter; test functionality carefully before submitting or replacing your currently published URL.
- No external backend secrets are included.

## Local test

With Node 22+ installed, run `npm run build`, `npm test`, then `npm run dev` and visit http://localhost:4173. The local dev script is the original Sites simulator; its API routes do not use the Vercel adapter.
