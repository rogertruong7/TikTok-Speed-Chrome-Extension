devLog("Script started for extension");

/** @type {HTMLVideoElement} */
let VIDEO = null;
let LISTENING_KEYS = false;
let isKeyPressed = false;

function setSpeed(video, speed) {
  log("setSpeed started: " + speed, 5);
  video.playbackRate = Number(speed);
  log("setSpeed finished: " + speed, 5);
}

chrome.storage.sync
  .get({
    enabled: true,
  })
  .then((items) => {
    const isTikTokPage = () => {
      return location.href.includes("https://www.tiktok.com/");
    };

    observer.watchElements([
      {
        elements: [".tiktok-web-player no-controls"],
        onElement: (element) => {
          checkPage();
        },
      },
    ]);

    // the current page that the script was inject could be a shorts page, so let's check it.
    checkPage();

    chrome.runtime.onMessage.addListener((message) => {
      if (message?.type !== "url update") return;
      // the url of the page changed, let's check if there's any youtube shorts.
      // this is in case the observer fail on us.

      setTimeout(() => {
        checkPage();
      }, 5000);
    });

    function checkPage() {

      if (!isTikTokPage()) {
        return;
      }

      const video = document.querySelector(
        ".tiktok-web-player no-controls video"
      );

      if (!video) return;

      if (video.hasAttribute("playbackRate")) {
        const playbackRate = parseFloat(video.getAttribute("playbackRate"));
        if ((playbackRate >= 2.0)) return devLog("video is already 2.0x speed");

        VIDEO = video;

        if (!LISTENING_KEYS) {
          LISTENING_KEYS = true;
          document.addEventListener("mousedown", (event) => {
            if (event.button === 0) {
              // Check if left mouse button is clicked
              isMousePressed = true;
              // Your code to handle the mouse button being held down
            }
          });

          document.addEventListener("mouseup", (event) => {
            if (event.button === 0) {
              // Check if left mouse button is released
              isMousePressed = false;
              // Your code to handle the mouse button being released
            }
          });

          // Continuously check if the mouse button is being held down
          function checkMousePressed() {
            if (isMousePressed) {
              setSpeed(video, 2.0);
            } else {
							setSpeed(video, 1.0);
						}
            requestAnimationFrame(checkMousePressed); // Continuously check
          }

          checkMousePressed();
        }
      }
    }
  });
