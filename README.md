# Hold to Speed Up for TikTok

A Chrome extension: press and hold the left mouse button on a TikTok video (or any other web video) to play it at 2x, like the mobile apps. Let go and it goes back to the speed it was at, and keeps playing.

## What's new in 2.0

- **No more pause on release.** Letting go used to pause the video, because the browser fires a `click` when you release and the player treats that as play/pause. The click that ends a hold is now swallowed, so the video keeps playing. A quick click still pauses as normal.
- **Works on every video in the feed,** not just the first one. It speeds up whichever video is under your cursor, so you never have to toggle the extension off and on.
- **Choose your speed:** 1.5x, 2x, 2.5x or 3x.
- **Hold a key instead of the mouse.** Pick any key in the popup and hold it to fast-forward.
- **On/off shortcut:** Alt+Shift+S by default, changeable at `chrome://extensions/shortcuts`. The toolbar icon shows "off" while it is switched off.
- **A rebuilt popup** that opens instantly (no web fonts) and applies every change to open tabs straight away.
- **Turn it off per site** from the toolbar popup.
- **Restores your speed.** If you had the video at 1.25x, letting go returns to 1.25x instead of forcing 1x.
- Works in fullscreen and inside embedded players. Links, buttons, seek bars and drags are left alone.
- No remote images or fonts, no libraries, no network requests. Settings are kept in `chrome.storage.sync`.
- It stays off on sites that already have their own press-and-hold behaviour (YouTube, Instagram).

## Install for development

1. Clone or download this repository.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and pick this folder.

## Files

- `js/content.js`: the hold detection, speed change, badge and click fix.
- `js/background.js`: the on/off keyboard shortcut.
- `html/popup.html`, `js/popup.js`, `css/popup.css`: the toolbar popup.

Made by Roger Truong. MIT licensed.

Not affiliated with or endorsed by TikTok.
