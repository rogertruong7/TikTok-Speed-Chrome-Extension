console.log("Script started for extension");

/** @type {HTMLVideoElement} */
let VIDEO = null;
let LISTENING_KEYS = false;
let isMousePressed = false;
let mouseDownTime = 0;
let img = document.createElement("img");
function setSpeed(speed) {
  // Changes the speed of the video
  VIDEO.playbackRate = speed;
}

chrome.storage.sync
  .get({
    enabled: true,
  })
  .then((items) => {
    // Checking if current website is on TikTok
    const isTikTokPage = () => {
      return location.href.includes("https://www.tiktok.com/");
    };

    // Checking if while we are on the website if our extension is enabled/disabled
    chrome.storage.sync.onChanged.addListener((changes) => {
      // Updating items.
      for (const key in changes) {
        items[key] = changes[key].newValue;
      }
      if (changes["enabled"]) {
        checkPage();
      }
    });

    // Mutation Summary Observer class which looks for the element on the page
    // In this case it looks for video type in html and if it is found it runs checkPage()
    observer.watchElements([
      {
        elements: ["video"],
        onElement: (element) => {
          checkPage();
        },
      },
    ]);

    // We run checkPage() just in case observer or the next thing doesn't pick it up
    checkPage();

    // This checks if the url changes and runs checkpage 2 seconds after
    // This is to ensure the extension runs even if the observer fails
    chrome.runtime.onMessage.addListener((message) => {
      if (message?.type !== "url update") {
        return;
      }
      setTimeout(() => {
        checkPage();
      }, 2000);
    });

    // Main function which checks the page for TikTok video
    function checkPage() {
      // If it's not a TikTok page return
      if (!isTikTokPage()) {
        return;
      }
      // If we have the extension disabled return
      if (!items.enabled) return;

      // Find the video with the html if that starts with xgwrapper
      // This is because all videos on the TikTok browser starts in a div with this id
      const video = document.querySelector('[id^="xgwrapper"] video');

      // If there is no video return
      if (!video) return;
      if (video) {
        const playbackRate = video.playbackRate;
        if (playbackRate >= 2.0) {
          console.log("Video is already 2.0x speed");
          return;
        }

        // Set the VIDEO variable declared above to the video
        VIDEO = video;

        // Listening keys ensures it only listens again after the listening is done
        if (!LISTENING_KEYS) {
          LISTENING_KEYS = true;

          document.addEventListener("mousedown", (event) => {
            // get the positions of the video
            const rect = VIDEO.getBoundingClientRect();
            // get the position of the mouse cursor
            let mouseX = event.clientX;
            let mouseY = event.clientY;
            console.log(mouseX + " " + mouseY);
            // If the mouse is within the rectangle
            if (
              mouseX >= rect.left &&
              mouseX <= rect.right &&
              mouseY >= rect.top &&
              mouseY <= rect.bottom
            ) {
              if (event.button === 0) {
                // Check if left mouse button is clicked
                isMousePressed = true;
                mouseDownTime = Date.now();
              }
            }
          });

          document.addEventListener("mouseup", (event) => {
            if (event.button === 0) {
              // Check if left mouse button is released
              isMousePressed = false;
              mouseDownTime = 0;
              if (VIDEO != null && VIDEO.parentNode.contains(img)) {
                VIDEO.parentNode.removeChild(img);
              }
              // Resets the time the mouse was pressed to 0
            }
          });

          // This function ontinuously checks if the mouse button is being held down
          function checkMousePressed() {
            if (isMousePressed) {
              const currentTime = Date.now();
              if (currentTime - mouseDownTime >= 300) {
                // This is done so that we change the speed only if the mouse is held for longer than 0.5 seconds
                setSpeed(2);
                if (!VIDEO.paused) {
                  img.src = "https://i.imgur.com/XfFCalr.png";
                  img.style.position = "absolute"; // Position it absolutely
                  img.style.zIndex = "9999"; // Set a high z-index to ensure it appears above other content
                  img.style.left = "50%"; // Center horizontally
                  img.style.bottom = "-1%"; // Align to the bottom
                  img.style.height = "10%";
                  img.style.transform = "translateX(-50%)"; // Adjust for centering
                  VIDEO.parentNode.appendChild(img);
                }
              }
            } else {
              // Otherwise we set the speed back to 1
              setSpeed(1);
            }
            requestAnimationFrame(checkMousePressed); // Continuously run this function because we need to know if the mouse is pressed
          }
          checkMousePressed();
        }
      }
    }
  });
