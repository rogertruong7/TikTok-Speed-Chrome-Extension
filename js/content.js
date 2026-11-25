// Hold to Speed Up: press and hold the left mouse button on a video to play it
// faster. Let go and it goes back to the speed it had before, and keeps playing.
//
// Why the release used to pause the video: a press and release on the same
// element always ends in a `click` event, and most players (including short
// video feeds) toggle play/pause on click. So after a hold we swallow that one
// click before the page sees it. A quick click still pauses as normal.
(() => {
  if (window.__holdToSpeedUpLoaded) return;
  window.__holdToSpeedUpLoaded = true;

  const DEFAULTS = { enabled: true, speed: 2, disabledSites: [], holdKey: "", holdKeyLabel: "" };
  const HOLD_DELAY_MS = 250; // how long a press must last before it counts as a hold
  const MOVE_TOLERANCE_PX = 10; // moving further than this before the delay = a drag, not a hold
  const INTERACTIVE =
    'a[href], button, input, textarea, select, label, summary, [contenteditable=""], [contenteditable="true"], ' +
    '[role="button"], [role="slider"], [role="link"], [role="menuitem"], [role="tab"], [role="checkbox"], [role="switch"]';

  let settings = { ...DEFAULTS };
  const host = location.hostname.replace(/^www\./, "");

  const isActiveHere = () =>
    settings.enabled && !(settings.disabledSites || []).includes(host);

  chrome.storage.sync.get(DEFAULTS).then((s) => (settings = { ...DEFAULTS, ...s }));
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    for (const [key, { newValue }] of Object.entries(changes)) settings[key] = newValue;
    if (!isActiveHere()) endHold();
  });

  // ---- Finding the video under the pointer ----
  // Players usually cover the <video> with overlay divs, so the event target is
  // rarely the video itself. elementsFromPoint sees through the stack.
  function videoAt(x, y) {
    for (const el of document.elementsFromPoint(x, y)) {
      if (el instanceof HTMLVideoElement) return el;
    }
    let best = null;
    let bestArea = 0;
    for (const v of document.querySelectorAll("video")) {
      const r = v.getBoundingClientRect();
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
      const area = r.width * r.height;
      if (area > bestArea) {
        best = v;
        bestArea = area;
      }
    }
    return best;
  }

  // Native <video controls> draw their bar inside the video box. Leave it alone.
  function onNativeControls(video, y) {
    if (!video.controls) return false;
    return video.getBoundingClientRect().bottom - y < 56;
  }

  // ---- The on-screen badge ----
  let badge = null;
  function showBadge(video, speed) {
    if (!badge) {
      badge = document.createElement("div");
      badge.setAttribute("aria-live", "polite");
      Object.assign(badge.style, {
        position: "fixed",
        zIndex: "2147483647",
        transform: "translateX(-50%)",
        padding: "6px 14px",
        borderRadius: "999px",
        background: "rgba(0, 0, 0, 0.62)",
        color: "#fff",
        font: "600 15px/1.2 system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        letterSpacing: "0.02em",
        pointerEvents: "none",
        userSelect: "none",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
      });
    }
    badge.textContent = `${speed}x \u25B6\u25B6`;
    const r = video.getBoundingClientRect();
    const top = Math.max(r.top, 0);
    const bottom = Math.min(r.bottom, window.innerHeight);
    badge.style.left = `${r.left + r.width / 2}px`;
    badge.style.top = `${top + Math.min(24, (bottom - top) * 0.05)}px`;
    // In fullscreen only the fullscreen element's subtree is painted.
    const parent = document.fullscreenElement || document.documentElement;
    if (badge.parentNode !== parent) parent.appendChild(badge);
  }
  function hideBadge() {
    badge?.remove();
  }

  // ---- Hold state ----
  let pending = null; // { video, x, y, timer, pointerId }
  let holding = null; // { video, previousRate, wasPlaying }
  let swallowClickUntil = 0;

  function keepRate() {
    // Some players reset playbackRate on their own; hold our speed while held.
    if (holding && holding.video.playbackRate !== holding.speed) {
      holding.video.playbackRate = holding.speed;
    }
  }

  let holdSource = "mouse";
  function startHold(video, source) {
    holdSource = source;
    const speed = Number(settings.speed) || DEFAULTS.speed;
    holding = {
      video,
      speed,
      previousRate: video.playbackRate || 1,
      wasPlaying: !video.paused,
    };
    video.playbackRate = speed;
    video.addEventListener("ratechange", keepRate);
    showBadge(video, speed);
  }

  function endHold({ swallowClick = false, resume = false } = {}) {
    clearTimeout(pending?.timer);
    pending = null;
    if (!holding) return;
    const { video, previousRate, wasPlaying } = holding;
    holding = null;
    video.removeEventListener("ratechange", keepRate);
    video.playbackRate = previousRate;
    hideBadge();
    if (swallowClick) swallowClickUntil = Date.now() + 600;
    if (resume) {
      // Safety net for players that pause on pointerup/mouseup instead of click.
      if (wasPlaying) {
        const resume = () => {
          if (video.paused) video.play().catch(() => {});
        };
        setTimeout(resume, 0);
        setTimeout(resume, 120);
      }
    }
  }

  window.addEventListener(
    "pointerdown",
    (e) => {
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      if (!e.isPrimary || !isActiveHere()) return;
      if (e.target instanceof Element && e.target.closest(INTERACTIVE)) return;
      const video = videoAt(e.clientX, e.clientY);
      if (!video || onNativeControls(video, e.clientY)) return;
      endHold();
      pending = {
        video,
        x: e.clientX,
        y: e.clientY,
        pointerId: e.pointerId,
        timer: setTimeout(() => {
          const p = pending;
          pending = null;
          if (p && p.video.isConnected) startHold(p.video, "mouse");
        }, HOLD_DELAY_MS),
      };
    },
    true,
  );

  window.addEventListener(
    "pointermove",
    (e) => {
      if (!pending || e.pointerId !== pending.pointerId) return;
      if (Math.hypot(e.clientX - pending.x, e.clientY - pending.y) > MOVE_TOLERANCE_PX) {
        clearTimeout(pending.timer);
        pending = null;
      }
    },
    true,
  );

  const release = (e) => {
    if (e.type === "pointerup" && e.button !== 0) return;
    if (pending) {
      clearTimeout(pending.timer); // a quick click: let the page handle it normally
      pending = null;
    }
    if (holding && holdSource === "mouse") endHold({ swallowClick: true, resume: true });
  };
  window.addEventListener("pointerup", release, true);
  window.addEventListener("pointercancel", () => endHold(), true);
  window.addEventListener("blur", () => endHold());
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) endHold();
  });

  // The fix: the click that ends a hold never reaches the player.
  window.addEventListener(
    "click",
    (e) => {
      if (Date.now() < swallowClickUntil && e.button === 0) {
        swallowClickUntil = 0;
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    true,
  );

  // ---- Optional hold key ----
  // The user can pick a key in the popup. Holding it speeds up the video under
  // the mouse, or failing that the biggest video that is playing on screen.
  let lastPointer = null;
  window.addEventListener(
    "pointermove",
    (e) => (lastPointer = { x: e.clientX, y: e.clientY }),
    { capture: true, passive: true },
  );

  function isTyping(target) {
    if (!(target instanceof Element)) return false;
    return Boolean(
      target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="textbox"]'),
    );
  }

  function videoForKey() {
    if (lastPointer) {
      const v = videoAt(lastPointer.x, lastPointer.y);
      if (v) return v;
    }
    let best = null;
    let bestScore = 0;
    for (const v of document.querySelectorAll("video")) {
      const r = v.getBoundingClientRect();
      const w = Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0));
      const h = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
      const score = w * h * (v.paused ? 0.1 : 1);
      if (score > bestScore) {
        best = v;
        bestScore = score;
      }
    }
    return best;
  }

  window.addEventListener(
    "keydown",
    (e) => {
      if (!settings.holdKey || e.code !== settings.holdKey) return;
      if (!isActiveHere() || isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.repeat || holding) return;
      const video = videoForKey();
      if (video) {
        endHold();
        startHold(video, "key");
      }
    },
    true,
  );

  window.addEventListener(
    "keyup",
    (e) => {
      if (!settings.holdKey || e.code !== settings.holdKey) return;
      if (holding && holdSource === "key") {
        e.preventDefault();
        e.stopImmediatePropagation();
        endHold({ resume: true });
      }
    },
    true,
  );

  // A long touch press opens the context menu; skip it while speeding up.
  window.addEventListener(
    "contextmenu",
    (e) => {
      if (holding) e.preventDefault();
    },
    true,
  );
})();
