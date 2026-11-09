# PWA Installation

Sous Clip is a Progressive Web App. Installing it gives you an app icon and, most usefully, the ability to share videos to Sous Clip from your phone's share sheet.

## Why Install as a PWA?

- **Share sheet**: send a video from YouTube, Instagram or TikTok straight to Sous Clip
- **Home screen icon** and a fullscreen window with no browser chrome
- **Offline shell**: the app shell and assets load without a connection and an offline banner shows. Extracting and editing need the server, so they wait until you are back online.

## Installation

### iOS (Safari)

1. Open your Sous Clip instance in **Safari** (e.g. `https://recipes.yourdomain.com`)
2. Log in so the app loads fully
3. Tap the **Share button** (square with arrow)
4. Scroll down and tap **Add to Home Screen**
5. Tap **Add**

> **Note:** iOS requires HTTPS for PWA installation. Make sure your instance is behind a reverse proxy with SSL. See the [Reverse Proxy Setup](reverse-proxy.md) guide.

### Android (Chrome)

1. Open your Sous Clip instance in **Chrome**
2. Log in
3. Chrome will show an **"Add to Home Screen"** banner automatically, or:
   - Tap the **three-dot menu** (top right)
   - Tap **Install app** or **Add to Home Screen**
4. Tap **Install**

### Desktop (Chrome / Edge)

1. Open your Sous Clip instance in Chrome or Edge
2. Look for the **install icon** in the address bar (monitor with down arrow)
3. Click **Install**

## Using the Share Sheet

Once installed, you can share cooking videos directly to Sous Clip:

1. Open a cooking video in YouTube, Instagram, TikTok, or any app
2. Tap the **Share** button
3. Select **Sous Clip** from the share sheet
4. The app opens and starts extracting the recipe

### Supported Platforms

| Source | Share Sheet | Paste URL |
|---|---|---|
| YouTube Shorts | Yes | Yes |
| Instagram Reels | Yes | Yes |
| TikTok | Yes | Yes |
| Any video URL | — | Yes |

## Troubleshooting

### "Add to Home Screen" not appearing

- Use **HTTPS** (required)
- Use **Safari on iOS** or **Chrome on Android**; other browsers may not support installing
- Refresh and wait a few seconds

### Share sheet doesn't show Sous Clip

- The share target only works once the PWA is installed
- iOS support for share targets is limited; paste the link instead
- Try reinstalling the PWA

### App shows stale content

A service worker caches the app. After an update, open the app, wait a few seconds, then close and reopen it. If that fails, clear the cache:
- **iOS:** Delete the app from home screen, reinstall from Safari
- **Android:** App Info > Storage > Clear Cache
- **Desktop:** Chrome DevTools > Application > Service Workers > Unregister
