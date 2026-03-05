# PWA Installation

Sous Clip is a Progressive Web App. Installing it gives you a native app experience with offline support and — most importantly — the ability to share videos directly from your phone's share sheet.

## Why Install as a PWA?

- **Share sheet integration** — Share a video from YouTube, Instagram, or TikTok directly to Sous Clip, just like sharing to any other app
- **Home screen icon** — Launch Sous Clip like a native app
- **Fullscreen experience** — No browser chrome, runs in standalone mode
- **Works offline** — The UI loads from cache even without a connection (extraction still requires network)

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
4. The app opens and automatically starts extracting the recipe

This is the fastest way to save recipes — no need to copy/paste URLs.

### Supported Platforms

| Source | Share Sheet | Paste URL |
|---|---|---|
| YouTube Shorts | Yes | Yes |
| Instagram Reels | Yes | Yes |
| TikTok | Yes | Yes |
| Any video URL | — | Yes |

## Troubleshooting

### "Add to Home Screen" not appearing

- Make sure you're using **HTTPS** (required for PWA)
- Make sure you're using **Safari on iOS** or **Chrome on Android** (other browsers may not support PWA installation)
- Try refreshing the page and waiting a few seconds

### Share sheet doesn't show Sous Clip

- The share target only works after the PWA is installed to the home screen
- On iOS, share target support may be limited depending on the iOS version
- Try uninstalling and reinstalling the PWA

### App shows stale content

The PWA uses a service worker that caches assets. After an update:

1. Open the app
2. Wait a few seconds while the service worker updates in the background
3. Close and reopen the app to see the new version

If that doesn't work, you can clear the cache:
- **iOS:** Delete the app from home screen, reinstall from Safari
- **Android:** App Info > Storage > Clear Cache
- **Desktop:** Chrome DevTools > Application > Service Workers > Unregister
