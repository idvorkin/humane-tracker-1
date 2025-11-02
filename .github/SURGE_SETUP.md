# GitHub Actions Surge Deployment Setup

This repository is configured to automatically deploy to Surge on every push to the `main` branch.

## Setup Instructions

### 1. Get Your Surge Token

First, login to Surge locally (one-time setup):

```bash
npm install -g surge
surge login
```

Then get your token:

```bash
surge token
```

This will output something like: `abc123def456...`

### 2. Add GitHub Secrets

Go to your GitHub repository:

1. Navigate to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add these two secrets:

#### Secret 1: SURGE_TOKEN
- **Name**: `SURGE_TOKEN`
- **Value**: Your token from `surge token` command

#### Secret 2: SURGE_DOMAIN
- **Name**: `SURGE_DOMAIN`
- **Value**: `humane-tracker.surge.sh`

### 3. Push to GitHub

Once secrets are configured, any push to `main` will trigger:
1. Install dependencies in `humane-tracker/` directory
2. Build the React app
3. Deploy to Surge

### 4. Verify Deployment

After pushing, check:
- **GitHub Actions**: See the workflow run in the Actions tab
- **Live Site**: Visit https://humane-tracker.surge.sh

## Workflow Details

The workflow (`.github/workflows/deploy-surge.yml`) runs on:
- Every push to `main` branch
- Pull requests to `main` (for preview)

### Manual Deployment

You can still deploy manually from the `humane-tracker/` directory:

```bash
cd humane-tracker
npm run deploy:surge
```

or

```bash
cd humane-tracker
./deploy-surge.sh
```

## Troubleshooting

### Build Fails
- Check the GitHub Actions logs
- Ensure all dependencies are in `package.json`
- Test the build locally: `cd humane-tracker && npm run build`

### Deployment Fails
- Verify `SURGE_TOKEN` is valid: `surge token`
- Check `SURGE_DOMAIN` format (no `https://` prefix)
- Ensure secrets are properly set in GitHub

### Site Not Updating
- Clear browser cache
- Check GitHub Actions for successful deployment
- Verify the correct branch was pushed

## Resources

- [Surge Documentation](https://surge.sh/help/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Template Repository](https://github.com/yavisht/deploy-via-surge.sh-github-action-template)
