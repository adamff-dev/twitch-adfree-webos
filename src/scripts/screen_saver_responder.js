// This script prevents the screen saver from activating while a video is playing.
// Source: https://blog.illixion.com/2022/10/webos-prevent-screensaver/
// Source: https://github.com/webosbrew/apps-repo/issues/60#issuecomment-1133907357

const PACKAGE_NAME = 'twitch.adamffdev.v1';

let bridge = new window.WebOSServiceBridge();

bridge.onservicecallback = (msg) => {
  let message = JSON.parse(msg);
  if (message.state === 'Active') {
    const videoElement = document.querySelector('video');
    // Only proceed if the video element exists and is currently playing;
    // otherwise, do not respond to the screen saver request.
    if (!videoElement || videoElement.paused) {
      return;
    }
    bridge.call(
      'luna://com.webos.service.tvpower/power/responseScreenSaverRequest',
      JSON.stringify({
        clientName: PACKAGE_NAME,
        ack: false,
        timestamp: message.timestamp
      })
    );
  }
};

bridge.call(
  'luna://com.webos.service.tvpower/power/registerScreenSaverRequest',
  JSON.stringify({
    subscribe: true,
    clientName: PACKAGE_NAME
  })
);

/**
 * Force babel to interpret this file as ESM so it
 * polyfills with ESM imports instead of CommonJS.
 */
export {};
