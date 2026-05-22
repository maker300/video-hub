# OAuth & Email Setup

Add the credentials below to `.env.local` after creating each app.

---

## Google

1. Go to [console.developers.google.com](https://console.developers.google.com)
2. Create a project → **APIs & Services** → **Credentials** → **Create OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Authorised redirect URI: `http://localhost:3000/api/auth/callback/google`
5. Copy Client ID and Secret into `.env.local`:

```
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

---

## GitHub

1. Go to [github.com/settings/developers](https://github.com/settings/developers)
2. **New OAuth App**
3. Homepage URL: `http://localhost:3000`
4. Callback URL: `http://localhost:3000/api/auth/callback/github`
5. Copy credentials:

```
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret
```

---

## Discord

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications)
2. **New Application** → **OAuth2** tab
3. Add redirect: `http://localhost:3000/api/auth/callback/discord`
4. Copy credentials:

```
DISCORD_CLIENT_ID=your-client-id
DISCORD_CLIENT_SECRET=your-client-secret
```

---

## Email (Magic Links via Gmail)

1. Enable 2-Step Verification on your Gmail account
2. Go to **Google Account** → **Security** → **App passwords**
3. Generate an app password for "Mail"
4. Fill in `.env.local`:

```
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=you@gmail.com
EMAIL_SERVER_PASSWORD=your-app-password
EMAIL_FROM=noreply@forexcourse.com
```

---

## Production

Update `NEXTAUTH_URL` to your production domain:

```
NEXTAUTH_URL=https://yourdomain.com
```

Update all OAuth app redirect URIs to the production domain as well.

For the database, switch `DATABASE_URL` to a PostgreSQL connection string and update `prisma/schema.prisma` provider to `postgresql`.
