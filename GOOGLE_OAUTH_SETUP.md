# Google OAuth Setup — Do This Once

## Step 1 — Create a Google Cloud project

1. Go to: https://console.cloud.google.com
2. Click "Select a project" at the top → "New Project"
3. Name it **ForexCourse** → Create
4. In the left menu go to: **APIs & Services → Credentials**

## Step 2 — Configure the OAuth consent screen

1. Click **"OAuth consent screen"** in the left menu
2. Choose **External** → Create
3. Fill in:
   - App name: `ForexCourse`
   - User support email: your email
   - Developer contact email: your email
4. Click **Save and Continue** through all remaining steps (scopes, test users)
5. Click **Back to Dashboard**

## Step 3 — Create OAuth credentials

1. Go back to **APIs & Services → Credentials**
2. Click **+ CREATE CREDENTIALS → OAuth client ID**
3. Application type: **Web application**
4. Name: `ForexCourse Web`
5. Under **Authorised JavaScript origins** add:
   ```
   http://localhost:3000
   ```
6. Under **Authorised redirect URIs** add:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
7. Click **CREATE**
8. Copy the **Client ID** and **Client Secret** shown in the popup

## Step 4 — Add to .env.local

Open `.env.local` in the project root and set:

```
GOOGLE_CLIENT_ID=paste-your-client-id-here
GOOGLE_CLIENT_SECRET=paste-your-client-secret-here
```

## Step 5 — Restart the dev server

```bash
# Stop the current server (Ctrl+C), then:
npm run dev
```

## Step 6 — Test

1. Open http://localhost:3000/auth/signup
2. Click **Sign up with Google**
3. You should see Google's account picker
4. After selecting an account you'll be redirected to /course

---

## GitHub OAuth (same process)

1. Go to: https://github.com/settings/developers → New OAuth App
2. Homepage URL: `http://localhost:3000`
3. Callback URL: `http://localhost:3000/api/auth/callback/github`
4. Add to `.env.local`:
   ```
   GITHUB_CLIENT_ID=your-client-id
   GITHUB_CLIENT_SECRET=your-client-secret
   ```

## Discord OAuth

1. Go to: https://discord.com/developers/applications → New Application
2. OAuth2 tab → Add redirect: `http://localhost:3000/api/auth/callback/discord`
3. Add to `.env.local`:
   ```
   DISCORD_CLIENT_ID=your-client-id
   DISCORD_CLIENT_SECRET=your-client-secret
   ```

---

## When deploying to production

Add these extra redirect URIs in Google Console:
```
https://yourdomain.com/api/auth/callback/google
```

Update `NEXTAUTH_URL` in your hosting environment variables:
```
NEXTAUTH_URL=https://yourdomain.com
```
