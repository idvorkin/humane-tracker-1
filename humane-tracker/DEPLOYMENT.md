# Deployment Instructions

## Firebase Hosting Deployment

### Prerequisites
1. Firebase CLI installed (`npm install -g firebase-tools`)
2. Access to the Firebase project (habit-tracker-b9ab9)

### Steps to Deploy

1. **Login to Firebase:**
   ```bash
   firebase login
   ```

2. **Build the production version:**
   ```bash
   npm run build
   ```

3. **Deploy to Firebase Hosting:**
   ```bash
   firebase deploy --only hosting
   ```

Your app will be available at: https://habit-tracker-b9ab9.web.app

### Alternative Deployment Options

#### Netlify
1. Create account at https://netlify.com
2. Drag and drop the `build` folder to deploy
3. Or use CLI: `npx netlify-cli deploy --prod --dir=build`

#### Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel --prod`

#### GitHub Pages
1. Install gh-pages: `npm install --save-dev gh-pages`
2. Add to package.json:
   ```json
   "homepage": "https://yourusername.github.io/humane-tracker",
   "scripts": {
     "predeploy": "npm run build",
     "deploy": "gh-pages -d build"
   }
   ```
3. Run: `npm run deploy`

## Environment Variables
Make sure to set up environment variables in your deployment platform:
- Copy values from `.env` file
- Each platform has its own way to set environment variables

## Post-Deployment
1. Update Firebase Authentication authorized domains
2. Test Google Sign-in functionality
3. Verify Firestore security rules are properly configured