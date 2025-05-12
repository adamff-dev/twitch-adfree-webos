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
  const baseURL = 'https://lg.tv.twitch.tv/';
  const twitchURL = new URL(openFollowing ? baseURL + 'following' : baseURL);
  return twitchURL;
}

export function handleLaunch(params) {
  console.info('handleLaunch', params);
  const twitchURL = getTwitchURL();
  window.location.href = twitchURL.toString();
}
