// Get options elements.
const enabledStateText = document.querySelector("#enabled_text");
const enabledCheckBox = document.querySelector("#enabled");

function updateText() {
  enabledStateText.textContent = enabledCheckBox.checked
    ? "Enabled"
    : "Disabled";
}

// Load options values.
chrome.storage.sync.get({
    enabled: true,
  })
  .then((items) => {
    enabledCheckBox.checked = items.enabled;
    console.log("hello");
    updateText();
  });

// listen for options changes and save it.
enabledCheckBox.addEventListener("change", () => {
  chrome.storage.sync.set({ enabled: enabledCheckBox.checked });
  updateText();
});

// update enabled/disabled text.
