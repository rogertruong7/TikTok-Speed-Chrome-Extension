console.log("Script started for extension");

/** @type {HTMLVideoElement} */
let VIDEO = null;
let LISTENING_KEYS = false;
let isMousePressed = false;
let mouseDownTime = 0;

function setSpeed(speed) {
  VIDEO.playbackRate = speed;
  console.log("vid " + VIDEO.src + " vid setSpeed " + VIDEO.playbackRate);
}

chrome.storage.sync
  .get({
    enabled: true,
  })
  .then((items) => {
    console.log(items.enabled);
    const isTikTokPage = () => {
      return location.href.includes("https://www.tiktok.com/");
    };

    chrome.storage.sync.onChanged.addListener((changes) => {
      // update items.
      for (const key in changes) {
        items[key] = changes[key].newValue;
      }

      if (changes["enabled"]) {
        checkPage();
      }
    });

    observer.watchElements([
      {
        elements: ["video"],
        onElement: (element) => {
          checkPage();
          console.log("Found element");
        },
      },
    ]);

    checkPage();

    chrome.runtime.onMessage.addListener((message) => {
      if (message?.type !== "url update") {
        return;
      }
      setTimeout(() => {
        checkPage();
      }, 2000);
    });

    function checkPage() {
      if (!isTikTokPage()) {
        return;
      }

      if (!items.enabled) return;

      const video = document.querySelector('[id^="xgwrapper"] video');

      if (!video) return;
      if (video) {
        const src = video.src;
        console.log("Found element video" + src);

        console.log("Video has playbackrate");

        const playbackRate = video.playbackRate;
        console.log(playbackRate);
        if (playbackRate >= 2.0)
          return console.log("video is already 2.0x speed");

        VIDEO = video;

        if (!LISTENING_KEYS) {
          LISTENING_KEYS = true;
          document.addEventListener("mousedown", (event) => {
            if (event.button === 0) {
              // Check if left mouse button is clicked
              isMousePressed = true;
              mouseDownTime = Date.now();
              // Your code to handle the mouse button being held down
            }
          });

          document.addEventListener("mouseup", (event) => {
            if (event.button === 0) {
              // Check if left mouse button is released
              isMousePressed = false;
              mouseDownTime = 0;
              // Your code to handle the mouse button being released
            }
          });

          // Continuously check if the mouse button is being held down
          function checkMousePressed() {
            if (isMousePressed) {
              const currentTime = Date.now();
              if (currentTime - mouseDownTime >= 500) {
                setSpeed(2);
              }
            } else {
              setSpeed(1);
            }
            requestAnimationFrame(checkMousePressed); // Continuously check
          }

          checkMousePressed();
        }
      }
    }
  });
