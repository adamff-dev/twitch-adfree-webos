// This script prevents the screen saver from activating while a video is playing.
// Source: https://blog.illixion.com/2022/10/webos-prevent-screensaver/
// Source: https://github.com/webosbrew/apps-repo/issues/60#issuecomment-1133907357

const PACKAGE_NAME = 'twitch.adamffdev.v1';

function registerScreenSaver() {
  if (window.__tafScreenSaver) return;

  // webOS can retain the previous document's client name after navigation.
  // Keep both native bridges alive for the lifetime of this document.
  const state = (window.__tafScreenSaver = {
    clientName: `${PACKAGE_NAME}.${Date.now().toString(36)}`,
    subscription: new window.WebOSServiceBridge(),
    response: new window.WebOSServiceBridge()
  });
  state.response.onservicecallback = () => {};

  state.subscription.onservicecallback = (msg) => {
    let message;
    try {
      message = JSON.parse(msg);
    } catch {
      return;
    }
    // webOS 4.x sends { returnValue, timestamp, instantBoot }, without state.
    // The initial subscription acknowledgement has no timestamp.
    if (
      message?.returnValue === false ||
      message?.timestamp == null ||
      document.hidden
    ) {
      return;
    }

    const playing = Array.from(document.querySelectorAll('video')).some(
      (video) => !video.paused && !video.ended && video.readyState >= 2
    );
    if (!playing) return;

    // Do not reuse the subscribing bridge for one-shot responses.
    state.response.call(
      'luna://com.webos.service.tvpower/power/responseScreenSaverRequest',
      JSON.stringify({
        clientName: state.clientName,
        ack: false,
        timestamp: message.timestamp
      })
    );
  };

  state.subscription.call(
    'luna://com.webos.service.tvpower/power/registerScreenSaverRequest',
    JSON.stringify({
      subscribe: true,
      clientName: state.clientName
    })
  );

  window.addEventListener('unload', () => {
    state.subscription.cancel();
    state.response.cancel();
  });
}

registerScreenSaver();

/**
 * Force babel to interpret this file as ESM so it
 * polyfills with ESM imports instead of CommonJS.
 */
export {};
