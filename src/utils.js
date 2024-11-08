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
  const ytURL = new URL(
    'https://lg.tv.twitch.tv/' + (openFollowing ? 'following' : undefined)
  );
  return ytURL;
}

export function handleLaunch(params) {
  console.info('handleLaunch', params);
  let ytURL = getTwitchURL();
  window.location.href = ytURL.toString();
}
