export function getAuthToken() {
  const authTokenMatch = document.cookie.match(/auth-token=([^;]+)/);
  if (authTokenMatch) {
    return `OAuth ${authTokenMatch[1]}`;
  }
}

export function getTwitchUsername(url) {
  const match = url.match(/^https?:\/\/([a-z0-9.-]+\.)?twitch\.tv\/(\w+)\/?$/i);
  return match ? match[2] : null;
}
