// Source: https://github.com/besuper/TwitchNoSub

let resolutions = {
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
        '") { broadcastType, createdAt, seekPreviewsURL, owner { login }, playbackAccessToken(params: {platform: "web", playerType: "site"}) { authorization { isForbidden } } }}'
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
  const response = await fetch(url);

  if (response.ok) {
    const data = await response.text();

    if (data.includes('.ts')) {
      // ts files should still use the h264
      return { codec: 'avc1.4D001E' };
    }

    if (data.includes('.mp4')) {
      // mp4 file use h265, but sometimes h264
      const mp4Request = await fetch(
        url.replace('index-dvr.m3u8', 'init-0.mp4')
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

const oldFetch = self.fetch;

self.fetch = async function (input, opt) {
  let url;
  if (input instanceof Request) {
    url = input.url;
  } else if (typeof input === 'string' || input instanceof String) {
    url = input.toString();
  } else {
    // Fallback to oldFetch
    return oldFetch(input, opt);
  }

  // Fix relative URL for Worker context
  if (url.startsWith('/')) {
    url = self.origin ? `${self.origin}${url}` : `${location.origin}${url}`;

    // Reconstruct Request if needed
    if (input instanceof Request) {
      input = new Request(url, input);
    } else {
      input = url;
    }
  }

  // Block Sentry requests
  if (url.includes('ingest.sentry.io')) {
    return;
  }

  let response = await oldFetch(input, opt);

  if (url.startsWith('https://usher.ttvnw.net/vod/')) {
    if (response.status != 200) {
      const vodId = url
        .split('https://usher.ttvnw.net/vod/')[1]
        .split('.m3u8')[0];
      const twitchVideoRes = await fetchTwitchDataGQL(vodId);

      if (twitchVideoRes == undefined) {
        return new Response('Unable to fetch twitch data API', { status: 403 });
      }

      const vodData = twitchVideoRes.data.video;

      // Skip if the vod is not archived
      if (
        vodData &&
        vodData.broadcastType &&
        vodData.broadcastType.toLowerCase() !== 'archive'
      ) {
        return response;
      }

      const channelData = vodData.owner;

      let sorted_dict = Object.keys(resolutions);
      sorted_dict = sorted_dict.reverse();

      let ordered_resolutions = {};

      for (const key in sorted_dict) {
        ordered_resolutions[sorted_dict[key]] = resolutions[sorted_dict[key]];
      }

      resolutions = ordered_resolutions;

      const currentURL = new URL(vodData.seekPreviewsURL);

      const domain = currentURL.host;
      const paths = currentURL.pathname.split('/');
      const vodSpecialID =
        paths[
          paths.findIndex((element) => element.includes('storyboards')) - 1
        ];

      let fakePlaylist = `#EXTM3U
#EXT-X-TWITCH-INFO:ORIGIN="s3",B="false",REGION="EU",USER-IP="127.0.0.1",SERVING-ID="${createServingID()}",CLUSTER="cloudfront_vod",USER-COUNTRY="BE",MANIFEST-CLUSTER="cloudfront_vod"`;

      const now = new Date('2023-02-10');
      const created = new Date(vodData.createdAt);

      const time_difference = now.getTime() - created.getTime();
      const days_difference = time_difference / (1000 * 3600 * 24);

      const broadcastType = vodData.broadcastType.toLowerCase();

      for (const [resKey, resValue] of Object.entries(resolutions)) {
        if (broadcastType === 'highlight') {
          url = `https://${domain}/${vodSpecialID}/${resKey}/highlight-${vodId}.m3u8`;
        } else if (broadcastType === 'upload' && days_difference > 7) {
          // Only old uploaded VOD works with this method now

          url = `https://${domain}/${channelData.login}/${vodId}/${vodSpecialID}/${resKey}/index-dvr.m3u8`;
        } else {
          url = `https://${domain}/${vodSpecialID}/${resKey}/index-dvr.m3u8`;
        }

        if (url == undefined) {
          continue;
        }

        // eslint-disable-next-line no-await-in-loop
        const result = await isValidQuality(url);

        if (result) {
          const quality =
            resKey == 'chunked' ? resValue.res.split('x')[1] + 'p' : resKey;
          const enabled = resKey == 'chunked' ? 'YES' : 'NO';
          const fps = resValue.fps;

          fakePlaylist += `
#EXT-X-MEDIA:TYPE=VIDEO,GROUP-ID="${quality}",NAME="${quality}",AUTOSELECT=${enabled},DEFAULT=${enabled}
#EXT-X-STREAM-INF:BANDWIDTH=${resValue.bandwidth},CODECS="${result.codec},mp4a.40.2",RESOLUTION=${resValue.res},VIDEO="${quality}",FRAME-RATE=${fps}
${url}`;
        }
      }

      const header = new Headers();
      header.append('Content-Type', 'application/vnd.apple.mpegurl');

      return new Response(fakePlaylist, { status: 200, headers: header });
    }
  }

  return response;
};
