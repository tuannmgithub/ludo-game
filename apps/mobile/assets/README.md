# Assets Placeholder

This directory should contain the following image assets before building the app.

## Required Images

### icon.png
- **Size:** 1024x1024 pixels
- **Format:** PNG with transparency
- **Usage:** App icon for iOS and Android
- **Design suggestion:** "Co Ca Ngua" logo on a dark navy (#1a1a2e) background with four horse pieces in red, blue, yellow, and green

### splash.png
- **Size:** 1242x2436 pixels (iPhone X resolution)
- **Format:** PNG
- **Usage:** Splash screen shown while the app loads
- **Background color:** #1a1a2e (dark navy, matches `backgroundColor` in app.json)
- **Design suggestion:** Centered game logo with the title "Co Ca Ngua" on a dark background

### adaptive-icon.png
- **Size:** 1024x1024 pixels
- **Format:** PNG with transparency
- **Usage:** Android adaptive icon foreground layer
- **Note:** Will be displayed on top of the `backgroundColor: "#1a1a2e"` background layer
- **Design suggestion:** Same as icon.png but without the background (transparent)

### favicon.png
- **Size:** 48x48 pixels (or 32x32)
- **Format:** PNG
- **Usage:** Web browser tab icon (for Expo Web target)

## Quick Placeholder Creation

To create placeholder images for development, you can use any image editor or run the following using ImageMagick if available:

```bash
# icon.png (1024x1024)
convert -size 1024x1024 xc:#1a1a2e -fill '#e94560' -font "Arial-Bold" -pointsize 120 -gravity center -annotate 0 "CCN" assets/icon.png

# splash.png (1242x2436)
convert -size 1242x2436 xc:#1a1a2e -fill '#e94560' -font "Arial-Bold" -pointsize 150 -gravity center -annotate 0 "Co Ca Ngua" assets/splash.png

# adaptive-icon.png (1024x1024)
convert -size 1024x1024 xc:transparent -fill '#e94560' -font "Arial-Bold" -pointsize 120 -gravity center -annotate 0 "CCN" assets/adaptive-icon.png

# favicon.png (48x48)
convert -size 48x48 xc:#1a1a2e -fill '#e94560' -draw "circle 24,24 24,4" assets/favicon.png
```

## Notes

- Without actual image files, `expo start` will still work but may show warnings about missing assets
- You can use the `expo-app-icon-generator` package to generate all required icon sizes from a single 1024x1024 source image
- For production builds via EAS Build, all four images must exist before running `eas build`
