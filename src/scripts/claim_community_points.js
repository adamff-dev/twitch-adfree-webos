import { showNotification } from './ui.js';
import { configRead } from '../config.js';
import { SHOW_CLAIM_POINTS_MESSAGE } from '../constants/config.constants.js';
import {
  apiConsumerType,
  contentTypeJson,
  tvClientId,
  twitchGraphQLEndpoint,
  xDeviceId
} from '../constants/requests.constants.js';
import { getAuthToken, getTwitchUsername } from '../utils/utils.js';

// Global constants
const claimIntervalMillis = 60000;

// Global variables
let currentChannelLogin;
let claimInterval;

// #region Functions to handle Twitch API requests
async function postChannelPointsContext(channelLogin) {
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

  const response = await fetch(twitchGraphQLEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': contentTypeJson,
      'Client-Id': tvClientId,
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

async function postClaimCommunityPoints(channelID, claimID) {
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

  const response = await fetch(twitchGraphQLEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': contentTypeJson,
      'Client-Id': tvClientId,
      'api-consumer-type': apiConsumerType,
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
  if (!currentChannelLogin) {
    return;
  }

  // Ensure the auth token is updated if the user has just logged in while the interval is already running
  if (!authToken || authToken === '') {
    authToken = getAuthToken();
  }

  try {
    const channelPointsContext =
      await postChannelPointsContext(currentChannelLogin);

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

    const claimResponse = await postClaimCommunityPoints(channelID, claimId);

    if (!configRead(SHOW_CLAIM_POINTS_MESSAGE)) {
      return;
    }

    const pointsEarned =
      claimResponse?.[0]?.data?.claimCommunityPoints?.claim?.pointsEarnedTotal;

    const currentPoints =
      claimResponse?.[0]?.data?.claimCommunityPoints?.currentPoints;

    let message;
    if (pointsEarned) {
      message = `+${pointsEarned} community points!`;
      if (currentPoints && configRead(SHOW_CLAIM_POINTS_MESSAGE)) {
        message += `<br>Current points: ${Number(currentPoints).toLocaleString()}`;
      }
      showNotification(message, 10000);
    }
  } catch (error) {
    console.error('Error during claim routine:', error);
  }
}
// #endregion Functions to handle Twitch API requests

// #region Main script

// Get authorization token from cookies
let authToken;
authToken = getAuthToken();

// Note: an alternative way is to listen to DOM changes with MutationObserver.
// Twitch username is in element "main section:first-of-type div.tw-root--theme-light h3"
setInterval(async () => {
  const newUsername = getTwitchUsername(window.location.href);
  if (newUsername && newUsername !== currentChannelLogin) {
    currentChannelLogin = newUsername;

    if (newUsername == 'search' || !newUsername) {
      // Reset the interval if the user is not on a channel page
      if (claimInterval) {
        clearInterval(claimInterval);
        claimInterval = null;
      }
      return;
    }

    // Run immediately
    await claimPointsRoutine();
    // Repeat every 1 minute
    claimInterval = setInterval(
      async () => await claimPointsRoutine(),
      claimIntervalMillis
    );
  }
}, 1000);

// #endregion Main script

/**
 * Force babel to interpret this file as ESM so it
 * polyfills with ESM imports instead of CommonJS.
 */
export {};
