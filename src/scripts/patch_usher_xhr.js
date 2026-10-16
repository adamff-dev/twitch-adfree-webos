// Main-thread counterpart to patch_amazon_worker.js.
//
// The LG TV Twitch client (lg.tv.twitch.tv) plays VODs/live streams through
// Twitch's "Pulsar" hls.js-based player, which loads the HLS manifest via
// XMLHttpRequest on the main thread - unlike the regular twitch.tv web
// player, which runs an Amazon IVS WASM Worker (patched by
// patch_amazon_worker.js). Since we can't be sure which player a given
// webOS build/region ends up with, this hooks window.XMLHttpRequest
// directly so the fix works regardless of whether the Worker-based patch
// ever gets a chance to run.

import { configRead } from '../config';
import {
  MAX_PROXY_SERVERS,
  PROXY_SERVER_KEYS,
  USE_CUSTOM_PROXY
} from '../constants/config.constants';

const resolutions = {
  '160p30': {
    res: '284x160',
    bandwidth: 290738,
    fps: 30
  },
  '360p30': {
    res: '640x360',
    bandwidth: 742051,
    fps: 30
  },
  '480p30': {
    res: '854x480',
    bandwidth: 1469111,
    fps: 30
  },
  '720p60': {
    res: '1280x720',
    bandwidth: 3430584,
    fps: 60
  },
  '1080p30': {
    res: '1920x1080',
    bandwidth: 5145876,
    fps: 30
  },
  '1080p60': {
    res: '1920x1080',
    bandwidth: 8438581,
    fps: 60
  },
  chunked: {
    res: '1920x1080',
    bandwidth: 5145876,
    fps: 30
  }
};

async function fetchTwitchDataGQL(vodID) {
  const resp = await fetch('https://gql.twitch.tv/gql', {
    method: 'POST',
    body: JSON.stringify({
      query:
        'query { video(id: "' +
        vodID +
        '") { broadcastType, createdAt, seekPreviewsURL, owner { login } }}'
    }),
    headers: {
      'Client-Id': 'kimne78kx3ncx6brgo4mv6wki5h1ko',
      Accept: 'application/json',
      'Content-Type': 'application/json'
    }
  });

  return resp.json();
}

function createServingID() {
  const w = '0123456789abcdefghijklmnopqrstuvwxyz'.split('');
  let id = '';

  for (let i = 0; i < 32; i++) {
    id += w[Math.floor(Math.random() * w.length)];
  }

  return id;
}

async function isValidQuality(url) {
  const response = await fetch(url, { cache: 'force-cache' });

  if (response.ok) {
    const data = await response.text();

    if (data.includes('.ts')) {
      // ts files should still use the h264
      return { codec: 'avc1.4D001E' };
    }

    if (data.includes('.mp4')) {
      // mp4 file use h265, but sometimes h264
      const mp4Request = await fetch(
        url.replace('index-dvr.m3u8', 'init-0.mp4'),
        { cache: 'force-cache' }
      );

      if (mp4Request.ok) {
        const content = await mp4Request.text();

        return {
          codec: content.includes('hev1') ? 'hev1.1.6.L93.B0' : 'avc1.4D001E'
        };
      }

      return { codec: 'hev1.1.6.L93.B0' };
    }
  }

  return null;
}

async function buildFakeVodPlaylist(vodId) {
  const twitchVideoRes = await fetchTwitchDataGQL(vodId);
  const vodData = twitchVideoRes?.data?.video;

  // Twitch sometimes returns no video (deleted/private) or a null
  // seekPreviewsURL (e.g. storyboards disabled) - bail out to the real
  // response instead of crashing the whole patch.
  if (!vodData || !vodData.seekPreviewsURL || !vodData.broadcastType) {
    return null;
  }

  const channelData = vodData.owner;

  const currentURL = new URL(vodData.seekPreviewsURL);
  const domain = currentURL.host;
  const paths = currentURL.pathname.split('/');
  const vodSpecialID =
    paths[paths.findIndex((element) => element.includes('storyboards')) - 1];

  let fakePlaylist = `#EXTM3U
#EXT-X-TWITCH-INFO:ORIGIN="s3",B="false",REGION="EU",USER-IP="127.0.0.1",SERVING-ID="${createServingID()}",CLUSTER="cloudfront_vod",USER-COUNTRY="BE",MANIFEST-CLUSTER="cloudfront_vod"`;

  // Fixed reference date: the special channel-login-prefixed CDN path only
  // applies to VODs from Twitch's old (pre-2023) storage scheme, not to how
  // old the VOD actually is today.
  const referenceDate = new Date('2023-02-10');
  const created = new Date(vodData.createdAt);
  const daysDifference =
    (referenceDate.getTime() - created.getTime()) / (1000 * 3600 * 24);

  const broadcastType = vodData.broadcastType.toLowerCase();

  const sortedResolutions = Object.fromEntries(
    Object.entries(resolutions).reverse()
  );

  for (const [resKey, resValue] of Object.entries(sortedResolutions)) {
    let playlistUrl;

    if (broadcastType === 'highlight') {
      playlistUrl = `https://${domain}/${vodSpecialID}/${resKey}/highlight-${vodId}.m3u8`;
    } else if (broadcastType === 'upload' && daysDifference > 7) {
      // Only old uploaded VODs work with this method now
      playlistUrl = `https://${domain}/${channelData.login}/${vodId}/${vodSpecialID}/${resKey}/index-dvr.m3u8`;
    } else {
      playlistUrl = `https://${domain}/${vodSpecialID}/${resKey}/index-dvr.m3u8`;
    }

    // eslint-disable-next-line no-await-in-loop
    const result = await isValidQuality(playlistUrl);

    if (result) {
      const quality =
        resKey === 'chunked' ? `${resValue.res.split('x')[1]}p` : resKey;
      const enabled = resKey === 'chunked' ? 'YES' : 'NO';

      fakePlaylist += `
#EXT-X-MEDIA:TYPE=VIDEO,GROUP-ID="${quality}",NAME="${quality}",AUTOSELECT=${enabled},DEFAULT=${enabled}
#EXT-X-STREAM-INF:BANDWIDTH=${resValue.bandwidth},CODECS="${result.codec},mp4a.40.2",RESOLUTION=${resValue.res},VIDEO="${quality}",FRAME-RATE=${resValue.fps}
${playlistUrl}`;
    }
  }

  if (!fakePlaylist.includes('#EXT-X-STREAM-INF')) {
    return null;
  }

  return fakePlaylist;
}

function respondWith(xhr, status, body, contentType) {
  Object.defineProperties(xhr, {
    readyState: { value: 4, configurable: true },
    status: { value: status, configurable: true },
    statusText: { value: 'OK', configurable: true },
    responseText: { value: body, configurable: true },
    response: { value: body, configurable: true },
    responseURL: { value: xhr._tafUrl, configurable: true }
  });

  xhr.getResponseHeader = (name) =>
    name.toLowerCase() === 'content-type' ? contentType : null;
  xhr.getAllResponseHeaders = () => `content-type: ${contentType}\r\n`;

  queueMicrotask(() => {
    xhr.dispatchEvent(new Event('readystatechange'));
    xhr.dispatchEvent(new Event('load'));
    xhr.dispatchEvent(new Event('loadend'));
  });
}

function abortSilently(xhr) {
  queueMicrotask(() => {
    xhr.dispatchEvent(new Event('error'));
    xhr.dispatchEvent(new Event('loadend'));
  });
}

function getProxyServers() {
  return PROXY_SERVER_KEYS.map((key) => configRead(key))
    .filter((value) => typeof value === 'string' && value.trim() !== '')
    .map((value) => value.trim())
    .slice(0, MAX_PROXY_SERVERS);
}

// Mirror of patch_amazon_worker.js: Twitch's access token/signature live in the
// query string, so templates using $channel/{channel} must carry the original
// parameters over or the proxy receives an unauthenticated request.
function mergeOriginalQuery(target, originalUrl) {
  const originalQuery = new URL(originalUrl).search.replace(/^\?/, '');
  if (originalQuery === '') {
    return target;
  }

  const hashAt = target.indexOf('#');
  const hash = hashAt === -1 ? '' : target.slice(hashAt);
  const withoutHash = hashAt === -1 ? target : target.slice(0, hashAt);
  const queryAt = withoutHash.indexOf('?');
  const base = queryAt === -1 ? withoutHash : withoutHash.slice(0, queryAt);
  const templateQuery = queryAt === -1 ? '' : withoutHash.slice(queryAt + 1);

  const presentKeys = new Set(
    templateQuery
      .split('&')
      .filter(Boolean)
      .map((param) => param.split('=')[0])
  );

  const carried = originalQuery
    .split('&')
    .filter(Boolean)
    .filter((param) => !presentKeys.has(param.split('=')[0]));

  const mergedQuery = [
    ...templateQuery.split('&').filter(Boolean),
    ...carried
  ].join('&');

  return (mergedQuery === '' ? base : `${base}?${mergedQuery}`) + hash;
}

function buildProxiedUrl(server, originalUrl, channel) {
  const trimmed = server.trim();

  if (trimmed.includes('$url') || trimmed.includes('{url}')) {
    return trimmed
      .split('$url')
      .join(originalUrl)
      .split('{url}')
      .join(originalUrl);
  }

  if (trimmed.includes('$channel') || trimmed.includes('{channel}')) {
    const target = trimmed
      .split('$channel')
      .join(channel)
      .split('{channel}')
      .join(channel);
    return mergeOriginalQuery(target, originalUrl);
  }

  if (!trimmed.includes('.m3u8')) {
    return trimmed.endsWith('/')
      ? trimmed + originalUrl
      : `${trimmed}/${originalUrl}`;
  }

  return mergeOriginalQuery(trimmed, originalUrl);
}

function isLivePlaylistUrl(url) {
  return (
    url.includes('.m3u8') &&
    url.includes('usher.ttvnw.net/api/') &&
    url.includes('/channel/hls/')
  );
}

async function proxyLivePlaylist(xhr, originalUrl, fallback) {
  let servers = [];
  let channel = null;

  try {
    if (configRead(USE_CUSTOM_PROXY)) {
      servers = getProxyServers();
    }

    const channelMatch = new URL(originalUrl).pathname.match(
      /\/channel\/hls\/([^.]+)\.m3u8/
    );
    if (channelMatch) {
      channel = channelMatch[1];
    }
  } catch (e) {
    console.warn('[TAF] Failed to read proxy config for luminous playback', e);
  }

  if (channel && servers.length > 0) {
    for (const server of servers) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const response = await fetch(
          buildProxiedUrl(server, originalUrl, channel)
        );

        if (response.ok) {
          // eslint-disable-next-line no-await-in-loop
          const playlistBody = await response.text();
          respondWith(
            xhr,
            response.status,
            playlistBody,
            'application/vnd.apple.mpegurl'
          );
          return;
        }
      } catch (e) {
        console.warn('[TAF] Proxy server failed for live playback', server, e);
      }
    }
  }

  fallback();
}

export function installUsherXhrPatch() {
  const oldXHR = window.XMLHttpRequest;

  window.XMLHttpRequest = class extends oldXHR {
    open(method, url, ...rest) {
      this._tafUrl = url;
      return super.open(method, url, ...rest);
    }

    send(body) {
      const url = this._tafUrl;

      if (typeof url !== 'string') {
        return super.send(body);
      }

      // Block Sentry telemetry
      if (url.includes('ingest.sentry.io')) {
        abortSilently(this);
        return;
      }

      // Redirect live HLS playlist requests through the configured proxy
      // servers, falling back to the next one and finally to the direct URL.
      if (isLivePlaylistUrl(url)) {
        proxyLivePlaylist(this, url, () => super.send(body));
        return;
      }

      // Patch playlist from unmuted to muted segments
      if (url.includes('cloudfront') && url.includes('.m3u8')) {
        fetch(url)
          .then((response) => response.text())
          .then((playlistBody) => {
            respondWith(
              this,
              200,
              playlistBody.replace(/-unmuted/g, '-muted'),
              'application/vnd.apple.mpegurl'
            );
          })
          .catch((err) => {
            console.warn('[TAF] Failed to patch muted playlist', err);
            super.send(body);
          });

        return;
      }

      if (url.startsWith('https://usher.ttvnw.net/vod/')) {
        const vodId = url
          .split('https://usher.ttvnw.net/vod/')[1]
          .split('.m3u8')[0];

        buildFakeVodPlaylist(vodId)
          .then((playlist) => {
            if (playlist) {
              respondWith(this, 200, playlist, 'application/vnd.apple.mpegurl');
            } else {
              super.send(body);
            }
          })
          .catch((err) => {
            console.warn('[TAF] Failed to build fake VOD playlist', err);
            super.send(body);
          });

        return;
      }

      return super.send(body);
    }
  };
}
