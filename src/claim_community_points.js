import { showNotification } from './ui.js';

const originalFetch = window.fetch;
window.fetch = (url, options) => {
  if (url.includes('gql.twitch.tv')) {
    options = options || {};
    options.headers = {
      ...options.headers,
      Origin: 'https://www.twitch.tv',
      Referer: 'https://www.twitch.tv/'
    };
  }
  return originalFetch(url, options);
};

async function postChannelPointsContext(channelLogin) {
  const url = 'https://gql.twitch.tv/gql';
  const body = {
    operationName: 'ChannelPointsContext',
    variables: { channelLogin },
    extensions: {
      persistedQuery: {
        version: 1,
        sha256Hash:
          '374314de591e69925fce3ddc2bcf085796f56ebb8cad67a0daa3165c03adc345'
      }
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Client-Id': currentClientId,
      'X-Device-Id': xDeviceId,
      Authorization: authToken
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

async function postIntegrity() {
  // Route the request through our custom proxy to sidestep CORS, letting us spoof the
  // Origin and Referer headers as https://www.twitch.tv/ (rather than https://lg.tv.twitch.tv/).
  // This is necessary to get a valid integrity token.
  const url = 'https://twitch-proxy-2od0.onrender.com/integrity';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Client-Id': currentClientId,
      Authorization: authToken,
      'X-Device-Id': xDeviceId
    },
    body: JSON.stringify({})
  });

  if (!response.ok) {
    throw new Error(`Integrity HTTP error! status: ${response.status}`);
  }

  return response.json();
}

async function postClaimCommunityPoints(channelID, claimID, clientIntegrity) {
  const url = 'https://gql.twitch.tv/gql';
  const body = [
    {
      operationName: 'ClaimCommunityPoints',
      variables: {
        input: {
          channelID,
          claimID
        }
      },
      extensions: {
        persistedQuery: {
          version: 1,
          sha256Hash:
            '46aaeebe02c99afdf4fc97c7c0cba964124bf6b0af229395f1f6d1feed05b3d0'
        }
      }
    }
  ];

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Client-Id': currentClientId,
      'Client-Integrity': clientIntegrity,
      'X-Device-Id': xDeviceId,
      Authorization: authToken
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(
      `ClaimCommunityPoints HTTP error! status: ${response.status}`
    );
  }

  return response.json();
}

async function claimPointsRoutine() {
  if (!channelLogin) {
    return;
  }

  try {
    const channelPointsContext = await postChannelPointsContext(channelLogin);

    if (
      channelPointsContext?.data?.community?.channel?.self?.communityPoints
        ?.availableClaim == null
    ) {
      return;
    }
    const claimId =
      channelPointsContext?.data?.community?.channel?.self?.communityPoints
        ?.availableClaim?.id;

    const channelID = channelPointsContext?.data?.community?.id;

    if (!claimId) {
      return;
    }

    const claimResponse = await postClaimCommunityPoints(
      channelID,
      claimId,
      integrityToken
    );

    const pointsEarned =
      claimResponse?.[0]?.data?.claimCommunityPoints?.claim?.pointsEarnedTotal;
    if (typeof pointsEarned === 'number' && pointsEarned > 0) {
      showNotification(`+${pointsEarned} community points!`, 10000);
    }
  } catch (error) {
    console.error('Error during claim routine:', error);
  }
}

function getTwitchUsername(url) {
  const match = url.match(/^https?:\/\/([a-z0-9.-]+\.)?twitch\.tv\/(\w+)\/?$/i);
  return match ? match[2] : null;
}

// Get authorization token from cookies
let authToken = '';
const authTokenMatch = document.cookie.match(/auth-token=([^;]+)/);
if (authTokenMatch) {
  authToken = `OAuth ${authTokenMatch[1]}`;
}

const integrityToken =
  'v4.local.y6UgqmSv4cEM3myCbhU68P4Jr92ImMZWloHk2fp5U7Fog9SZ0JKflEn1yr62n1mW44jCQ8IQo44XgTZivfEP_LeAThE-kfccRbG97fDqIg2KMvqymA0Ma9n7xSIw-Aw8j5bAUoj9JKFY62bplgtKibddbAtn82aC4LnQsALwgyI8qT0OgzuRJrLRmpzvtW7zF53u54BCHbKgl56zZr1_bP0386PkSC3jKLcyPIBfBXQu1_S_ydSyXbZsuWoN3FO6Bo9sJxqIsokD0pOd67mqdU8E65WIjNjJx3F-kH_y2Q3tfFmWIk6Q-6RiYzglGX95XjwNswvqZogUTorkacorDrKkemzPm3ehOCqnxQfbnf76fFceu0HgLWxWjm8iOl3P0EBsGS1UH4lZYBbpC0LpYB6LNLWtcveZURB8outiyNgHaD8Qw4CBTMqKoKWFMVOQXl5W9ROgwnGlLIOM';
const currentClientId = 'kimne78kx3ncx6brgo4mv6wki5h1ko';
const xDeviceId = 'sAvn9KoA5020z5LRYxojeHuBCpOPZ5f3';

let channelLogin;
let claimInterval;

setInterval(async () => {
  const newUsername = getTwitchUsername(window.location.href);
  if (newUsername && newUsername !== channelLogin) {
    channelLogin = newUsername;

    if (newUsername == 'search') {
      return;
    }

    await postIntegrity();

    if (claimInterval) {
      clearInterval(claimInterval);
    }

    // Run immediately
    await claimPointsRoutine();
    // Repeat every 1 minute
    claimInterval = setInterval(
      async () => await claimPointsRoutine(),
      1 * 60 * 1000
    );
  }
}, 1000);

/**
 * Force babel to interpret this file as ESM so it
 * polyfills with ESM imports instead of CommonJS.
 */
export {};
