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
      'Client-Id': communityPointsClientId,
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
  const url = 'https://twitch-proxy-2od0.onrender.com/integrity';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Client-Id': communityPointsClientId,
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
      'Client-Id': communityPointsClientId,
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
    const integrityResponse = await postIntegrity();
    console.log('Integrity Token:', integrityResponse.token);

    const channelPointsContext = await postChannelPointsContext(channelLogin);
    console.log('Channel Points Context:', channelPointsContext);

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
      console.warn('No claimable points available at this time.');
      return;
    }

    const claimResponse = await postClaimCommunityPoints(
      channelID,
      claimId,
      'v4.local.y6UgqmSv4cEM3myCbhU68P4Jr92ImMZWloHk2fp5U7Fog9SZ0JKflEn1yr62n1mW44jCQ8IQo44XgTZivfEP_LeAThE-kfccRbG97fDqIg2KMvqymA0Ma9n7xSIw-Aw8j5bAUoj9JKFY62bplgtKibddbAtn82aC4LnQsALwgyI8qT0OgzuRJrLRmpzvtW7zF53u54BCHbKgl56zZr1_bP0386PkSC3jKLcyPIBfBXQu1_S_ydSyXbZsuWoN3FO6Bo9sJxqIsokD0pOd67mqdU8E65WIjNjJx3F-kH_y2Q3tfFmWIk6Q-6RiYzglGX95XjwNswvqZogUTorkacorDrKkemzPm3ehOCqnxQfbnf76fFceu0HgLWxWjm8iOl3P0EBsGS1UH4lZYBbpC0LpYB6LNLWtcveZURB8outiyNgHaD8Qw4CBTMqKoKWFMVOQXl5W9ROgwnGlLIOM'
    );
    console.log('Claim Response:', claimResponse);
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

// Set client ID
let communityPointsClientId = 'kimne78kx3ncx6brgo4mv6wki5h1ko';

// Get client-session-id from localStorage
let clientSessionId =
  localStorage.getItem('local_storage_app_session_id') ||
  sessionStorage.getItem('twitchSessionID') ||
  '';

// Get client-version from sessionStorage (twilight.update_manager.known_builds)
let clientVersion = '';
try {
  let buildsRaw =
    sessionStorage.getItem('twilight.update_manager.known_builds') || '';
  // Remove leading '["' and trailing '"]' if present
  if (buildsRaw.startsWith('["') && buildsRaw.endsWith('"]')) {
    clientVersion = buildsRaw.slice(2, -2);
  } else {
    // Fallback to JSON parse if not in expected format
    const builds = JSON.parse(buildsRaw || '[]');
    if (Array.isArray(builds) && builds.length > 0) {
      clientVersion = builds[0];
    }
  }
} catch (e) {
  console.error('Error parsing client version:', e);
  clientVersion = '';
}

// Get x-device-id from localStorage
let xDeviceId = '';
const uniqueIdMatch = document.cookie.match(/unique_id=([^;]+)/);
if (uniqueIdMatch && uniqueIdMatch[1]) {
  xDeviceId = uniqueIdMatch[1];
} else {
  const localCopyUniqueId = localStorage.getItem('local_copy_unique_id');
  if (localCopyUniqueId) {
    xDeviceId = localCopyUniqueId.replace(/"/g, '');
  }
}
xDeviceId = 'sAvn9KoA5020z5LRYxojeHuBCpOPZ5f3';

// Set referer
const referer = 'https://www.twitch.tv/'; // Replace with your actual referer if needed

console.log({
  authorization: authToken,
  clientId: communityPointsClientId,
  clientSessionId,
  clientVersion,
  xDeviceId,
  referer
});

let channelLogin;
let claimInterval;

setInterval(() => {
  const newUsername = getTwitchUsername(window.location.href);
  if (newUsername && newUsername !== channelLogin && newUsername != 'search') {
    channelLogin = newUsername;
    console.log('Username changed to:', channelLogin);

    // Run immediately
    claimPointsRoutine();

    // Repeat every 15 minutes (15 * 60 * 1000 ms)
    clearInterval(claimInterval);
    claimInterval = setInterval(claimPointsRoutine, 1 * 60 * 1000);
  }
}, 1000);

/**
 * Force babel to interpret this file as ESM so it
 * polyfills with ESM imports instead of CommonJS.
 */
export {};
