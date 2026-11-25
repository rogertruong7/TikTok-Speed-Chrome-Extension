const DEFAULTS = { enabled: true, speed: 2, disabledSites: [], holdKey: "", holdKeyLabel: "" };
const SPEEDS = [1.5, 2, 2.5, 3];
const NATIVE_HOLD = ["youtube.com", "instagram.com"];

const $ = (id) => document.getElementById(id);
const speedGroup = $("speed");
const enabled = $("enabled");
const site = $("site");
const holdKeyBtn = $("holdKey");

for (const s of SPEEDS) {
  const label = document.createElement("label");
  const input = document.createElement("input");
  input.type = "radio";
  input.name = "speed";
  input.value = String(s);
  const text = document.createElement("span");
  text.textContent = `${s}x`;
  label.append(input, text);
  speedGroup.append(label);
}

let host = "";
let recording = false;
let current = { ...DEFAULTS };

const NAMED_KEYS = {
  Space: "Space", Backquote: "`", Minus: "-", Equal: "=", BracketLeft: "[", BracketRight: "]",
  Backslash: "\\", Semicolon: ";", Quote: "'", Comma: ",", Period: ".", Slash: "/",
  ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→",
};

function keyLabel(e) {
  if (NAMED_KEYS[e.code]) return NAMED_KEYS[e.code];
  if (/^Key[A-Z]$/.test(e.code)) return e.code.slice(3);
  if (/^Digit\d$/.test(e.code)) return e.code.slice(5);
  if (/^Numpad/.test(e.code)) return "Num " + e.code.slice(6);
  return e.key.length === 1 ? e.key.toUpperCase() : e.key;
}

function render() {
  enabled.checked = current.enabled;
  document.body.classList.toggle("off", !current.enabled);
  const chosen = speedGroup.querySelector(`input[value="${Number(current.speed)}"]`);
  if (chosen) chosen.checked = true;
  if (!recording) {
    holdKeyBtn.textContent = current.holdKey ? current.holdKeyLabel || current.holdKey : "Set key";
    holdKeyBtn.classList.toggle("empty", !current.holdKey);
  }
  if (host) site.checked = !(current.disabledSites || []).includes(host);
}

async function init() {
  current = { ...DEFAULTS, ...(await chrome.storage.sync.get(DEFAULTS)) };
  render();

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab?.url || "");
    if (url.protocol === "http:" || url.protocol === "https:") host = url.hostname.replace(/^www\./, "");
  } catch {}

  if (!host) {
    $("siteSection").hidden = true;
  } else if (NATIVE_HOLD.some((d) => host === d || host.endsWith("." + d))) {
    $("siteRow").hidden = true;
    $("siteNote").hidden = false;
    $("siteNote").textContent = `${host} has its own press-and-hold, so this extension stays out of the way there.`;
  } else {
    $("siteName").textContent = host;
    render();
  }

  const commands = await chrome.commands.getAll();
  const toggle = commands.find((c) => c.name === "toggle-enabled");
  $("shortcut").textContent = toggle?.shortcut || "not set";
}

enabled.addEventListener("change", () => chrome.storage.sync.set({ enabled: enabled.checked }));

site.addEventListener("change", async () => {
  const { disabledSites } = await chrome.storage.sync.get(DEFAULTS);
  const next = new Set(disabledSites);
  if (site.checked) next.delete(host);
  else next.add(host);
  chrome.storage.sync.set({ disabledSites: [...next] });
});

speedGroup.addEventListener("change", (e) => chrome.storage.sync.set({ speed: Number(e.target.value) }));

holdKeyBtn.addEventListener("click", () => {
  recording = !recording;
  holdKeyBtn.classList.toggle("recording", recording);
  if (recording) {
    holdKeyBtn.classList.remove("empty");
    holdKeyBtn.textContent = "Press a key…";
  } else {
    render();
  }
});

document.addEventListener("keydown", (e) => {
  if (!recording) return;
  e.preventDefault();
  if (["Shift", "Control", "Alt", "Meta", "OS"].includes(e.key)) return;
  recording = false;
  holdKeyBtn.classList.remove("recording");
  if (e.key === "Escape") {
    render();
  } else if (e.key === "Backspace" || e.key === "Delete") {
    chrome.storage.sync.set({ holdKey: "", holdKeyLabel: "" });
  } else {
    chrome.storage.sync.set({ holdKey: e.code, holdKeyLabel: keyLabel(e) });
  }
});

$("editShortcut").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
});

// Stay in step with changes made elsewhere, such as the on/off shortcut.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  for (const [key, { newValue }] of Object.entries(changes)) current[key] = newValue ?? DEFAULTS[key];
  render();
});

init();
