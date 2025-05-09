import { configRead } from './config';

export function extractLaunchParams() {
  if (window.launchParams) {
    return JSON.parse(window.launchParams);
  } else {
    return {};
  }
}

export function getTwitchURL() {
  const openFollowing = configRead('openFollowing');
  const twitchURL = new URL(
    'https://lg.tv.twitch.tv/' + (openFollowing ? 'following' : undefined)
  );
  return twitchURL;
}

export function handleLaunch(params) {
  console.info('handleLaunch', params);
  const twitchURL = getTwitchURL();
  window.location.href = twitchURL.toString();
}
