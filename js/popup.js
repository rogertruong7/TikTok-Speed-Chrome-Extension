// Get options elements.
const enabledStateText = document.querySelector("#enabled_text");
const enabledCheckBox = document.querySelector("#enabled");

// Load options values.
chrome.storage.sync.get({ enabled: true }).then((items) => {
  enabledCheckBox.checked = items.enabled;
  updateText();
});

// listen for options changes and save it.
enabledCheckBox.addEventListener("change", (e) => {
  chrome.storage.sync.set({ enabled: enabledCheckBox.checked });
  updateText();
});

// update enabled/disabled text.
function updateText() {
  enabledStateText.textContent = enabledCheckBox.checked
    ? "Enabled"
    : "Disabled";
}
