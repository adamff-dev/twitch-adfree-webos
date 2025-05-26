import { configRead } from '../config';
import { LOAD_7TV_EMOTES } from '../constants/config.constants';
import {
  tvClientId,
  twitchGraphQLEndpoint,
  xDeviceId
} from '../constants/requests.constants';
import { getAuthToken, getTwitchUsername } from '../utils/utils';
import { showNotification } from './ui';

(function () {
  'use strict';

  const API_7TV = 'https://7tv.io/v3';
  const MESSAGE_SELECTOR = 'css-175oi2r';

  let emoteMap = new Map();
  let currentChannelLogin = null;
  let authToken = null;
  async function fetch7TVEmotes(userId) {
    try {
      const res = await fetch(`${API_7TV}/users/twitch/${userId}`);
      if (!res.ok) return;

      const data = await res.json();
      const emotes = data.emote_set?.emotes || [];

      if (emotes.length === 0) {
        return;
      }

      showNotification('7TV emotes loaded successfully!');

      emotes.forEach((emote) => {
        const url = `https:${emote.data.host.url}/1x.webp`;
        emoteMap.set(emote.name, url);
      });
      console.log(emoteMap);
    } catch (err) {
      console.error('[7TV] Error al obtener emotes:', err);
    }
  }

  function replaceEmotes(text) {
    if (!text) return text;

    let replacedText = text;
    emoteMap.forEach((url, name) => {
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedName}\\b`, 'g');
      replacedText = replacedText.replace(
        regex,
        `<img src="${url}" alt="${name}" style="width: 28px; height: 28px; vertical-align: middle;">`
      );
    });

    return replacedText;
  }
  function processChatMessage(node) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
      const replacedText = replaceEmotes(node.textContent);
      if (replacedText !== node.textContent) {
        const span = document.createElement('span');
        span.innerHTML = replacedText.replace(
          /<img /g,
          '<img style="width: 2.4rem; height: 2.4rem; vertical-align: middle;" '
        );
        node.replaceWith(span);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      node.childNodes.forEach(processChatMessage);
    }
  }

  function observeChat() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (
            node.nodeType === Node.ELEMENT_NODE &&
            node.classList.contains(MESSAGE_SELECTOR)
          ) {
            processChatMessage(node);
          }
        });
      });
    });

    observer.observe(document, { childList: true, subtree: true });
  }

  function init() {
    setInterval(async () => {
      if (!configRead(LOAD_7TV_EMOTES)) {
        return;
      }
      const newUsername = getTwitchUsername(window.location.href);
      if (newUsername && newUsername !== currentChannelLogin) {
        currentChannelLogin = newUsername;

        if (newUsername == 'search' || !newUsername) {
          return;
        }

        authToken = getAuthToken();

        // Get user ID from Twitch GQL API
        try {
          const response = await fetch(twitchGraphQLEndpoint, {
            method: 'POST',
            headers: {
              'Client-ID': tvClientId, // Replace with your Twitch Client ID
              'X-Device-Id': xDeviceId,
              Authorization: authToken, // Replace with your OAuth token
              'Content-Type': 'application/json'
            },
            body: JSON.stringify([
              {
                operationName: 'GetUserID',
                variables: {
                  login: currentChannelLogin,
                  lookupType: 'ACTIVE'
                },
                extensions: {
                  persistedQuery: {
                    version: 1,
                    sha256Hash:
                      'bf6c594605caa0c63522f690156aa04bd434870bf963deb76668c381d16fcaa5'
                  }
                }
              }
            ])
          });

          if (response.ok) {
            const data = await response.json();
            console.log(data);
            const userId = data[0]?.data?.user?.id;
            if (userId) {
              await fetch7TVEmotes(userId);
            }
          } else {
            console.error('Error fetching user ID:', response.statusText);
          }
        } catch (error) {
          console.error('Error fetching user ID:', error);
        }
      }
    }, 1000);

    observeChat();
  }

  init();
})();

/**
 * Force babel to interpret this file as ESM so it
 * polyfills with ESM imports instead of CommonJS.
 */
export {};
