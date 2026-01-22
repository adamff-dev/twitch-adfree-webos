const twitchUrl = 'https://lg.tv.twitch.tv/';

export function handleLaunch() {
  // Example luna-send command to launch the app with a specific channel:
  // luna-send -n 1 -f luna://com.webos.applicationManager/launch '{"id":"twitch.adamffdev.v1", "params":{"channel":"illojuan"}}'
  let contentTarget = '';

  if (window.webOSSystem && window.webOSSystem.launchParams) {
    contentTarget = window.webOSSystem.launchParams.channel || '';
  }

  window.location.href = `${twitchUrl}${contentTarget}`;
}

handleLaunch();
