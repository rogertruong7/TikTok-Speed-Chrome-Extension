// Keyboard shortcut (set at chrome://extensions/shortcuts) to switch the
// extension on or off everywhere. The toolbar badge shows when it is off.
const DEFAULTS = { enabled: true };

async function showState(enabled) {
  await chrome.action.setBadgeBackgroundColor({ color: "#55555f" });
  await chrome.action.setBadgeText({ text: enabled ? "" : "off" });
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "toggle-enabled") return;
  const { enabled } = await chrome.storage.sync.get(DEFAULTS);
  await chrome.storage.sync.set({ enabled: !enabled });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.enabled) showState(changes.enabled.newValue !== false);
});

const init = () => chrome.storage.sync.get(DEFAULTS).then((s) => showState(s.enabled));
chrome.runtime.onStartup.addListener(init);
chrome.runtime.onInstalled.addListener(init);
