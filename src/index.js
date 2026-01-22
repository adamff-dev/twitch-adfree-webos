const twitchUrl = 'https://lg.tv.twitch.tv/';

export function handleLaunch() {
  // Use luna-send command to launch the app with a specific channel:
  // Example: luna-send -n 1 -f luna://com.webos.applicationManager/launch '{"id":"twitch.adamffdev.v1", "params":{"channel":"CHANNEL_NAME"}}'
  let contentTarget = '';

  if (window.webOSSystem && window.webOSSystem.launchParams) {
    contentTarget = window.webOSSystem.launchParams.channel || '';
  }

  // Fallback to URL parameter
  // Example: npm run launch -- -p '{"channel":"CHANNEL_NAME"}'
  if (!contentTarget) {
    const params = new URLSearchParams(window.location.search);
    contentTarget = params.get('channel') || '';
  }

  window.location.href = `${twitchUrl}${contentTarget}`;
}

handleLaunch();
