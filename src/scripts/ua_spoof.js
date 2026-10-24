// lg.tv.twitch.tv shows a non-dismissable "Twitch is no longer supported on
// this device" modal when the user agent contains both "Web0S" and
// "Chrome/38.0" (webOS 3.x). Bump only the minor version so the check fails
// while hls.js and friends, which only parse the major version, keep treating
// the browser as Chrome 38.

const originalUA = window.navigator.userAgent;
const spoofedUA = originalUA.replace(/Chrome\/38\.0\./, 'Chrome/38.1.');

if (spoofedUA !== originalUA) {
  const getter = () => spoofedUA;
  let patched = false;

  try {
    Object.defineProperty(window.navigator, 'userAgent', {
      get: getter,
      configurable: true
    });
    patched = window.navigator.userAgent === spoofedUA;
  } catch (err) {
    console.warn('[TAF] defineProperty on navigator.userAgent failed:', err);
  }

  if (!patched) {
    try {
      // Older Chromium builds (webOS 3.x) define DOM attributes on the
      // instance and may ignore defineProperty; __defineGetter__ still works.
      window.navigator.__defineGetter__('userAgent', getter);
      patched = window.navigator.userAgent === spoofedUA;
    } catch (err) {
      console.warn(
        '[TAF] __defineGetter__ on navigator.userAgent failed:',
        err
      );
    }
  }

  console.info('[TAF] UA spoof', patched ? 'applied' : 'FAILED', spoofedUA);
}
