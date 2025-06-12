import { configRead } from '../config';
import { LOAD_EMOTES } from '../constants/config.constants';
import {
  tvClientId,
  twitchGraphQLEndpoint,
  xDeviceId
} from '../constants/requests.constants';
import { getAuthToken, getTwitchUsername } from '../utils/utils';
import { showNotification } from './ui';

(function () {
  // Constants
  const EMOTE_SIZE = '1x';
  const API_7TV = 'https://7tv.io/v3';
  const API_BTTV = 'https://api.betterttv.net/3/cached';
  const CHAT_SELECTOR = 'main > aside';
  const MESSAGE_SELECTOR = 'r-1xq2hnv';

  // Global variables
  let emoteMap7tv = new Map();
  let emoteMapBttv = new Map();
  let currentChannelLogin = null;
  let authToken = null;

  async function fetch7TVEmotes(userId) {
    try {
      const res = await fetch(`${API_7TV}/users/twitch/${userId}`);
      if (!res.ok) {
        emoteMap7tv = new Map();
        return;
      }

      const data = await res.json();
      const emotes = data.emote_set?.emotes || [];

      if (emotes.length === 0) {
        return;
      }

      showNotification('7TV emotes loaded successfully!');

      emotes.forEach((emote) => {
        const url = `https:${emote.data.host.url}/${EMOTE_SIZE}.webp`;
        emoteMap7tv.set(emote.name, url);
      });
    } catch (err) {
      console.error('[7TV] Error al obtener emotes:', err);
    }
  }

  async function fetchBTTVEmotes(userId) {
    try {
      const res = await fetch(`${API_BTTV}/users/twitch/${userId}`);

      if (!res.ok) {
        emoteMapBttv = new Map();
        return;
      }
      const data = await res.json();

      const emotes = [
        ...(data.sharedEmotes || []),
        ...(data.channelEmotes || [])
      ];
      if (emotes.length === 0) {
        return;
      }
      showNotification('BTTV emotes loaded successfully!');
      emotes.forEach((emote) => {
        const url = `https://cdn.betterttv.net/emote/${emote.id}/${EMOTE_SIZE}.${emote.imageType}`;
        emoteMapBttv.set(emote.code, url);
      });
    } catch (err) {
      console.error('[BTTV] Error al obtener emotes:', err);
    }
  }

  function replaceEmotes(text) {
    if (!text) return text;

    let replacedText = text;
    // Replace emote names using a split-and-rebuild approach to avoid regex issues
    if (emoteMap7tv.size === 0 && emoteMapBttv.size === 0) return replacedText;

    // Build a Set of emote names for fast lookup

    // Split text into words and non-word separators
    const parts = replacedText.split(/(\s+)/);

    // Replace each part that matches an emote name
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const url7tv = emoteMap7tv.get(part);
      const urlBttv = emoteMapBttv.get(part);
      const url = url7tv || urlBttv;
      if (url) {
        parts[i] = `<img src="${url}" alt="${part}" class="emote">`;
      }
    }

    replacedText = parts.join('');

    return replacedText;
  }
  function processChatMessage(node) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
      const replacedText = replaceEmotes(node.textContent);
      if (replacedText !== node.textContent) {
        const span = document.createElement('span');
        span.innerHTML = replacedText;
        node.replaceWith(span);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      node.childNodes.forEach(processChatMessage);
    }
  }

  function observeChat() {
    const observer = new MutationObserver((mutations) => {
      if (!document.querySelector(CHAT_SELECTOR)) {
        return;
      }
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
      if (!configRead(LOAD_EMOTES)) {
        return;
      }
      const newUsername = getTwitchUsername(window.location.href);
      if (newUsername && newUsername !== currentChannelLogin) {
        currentChannelLogin = newUsername;
        emoteMap7tv = new Map(); // Reset emote map for the new channel
        emoteMapBttv = new Map();

        if (newUsername == 'search' || !newUsername) {
          return;
        }

        authToken = getAuthToken();

        // Get user ID from Twitch GQL API
        try {
          const response = await fetch(twitchGraphQLEndpoint, {
            method: 'POST',
            headers: {
              'Client-ID': tvClientId,
              'X-Device-Id': xDeviceId,
              Authorization: authToken,
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
            const userId = data[0]?.data?.user?.id;
            if (userId) {
              await fetch7TVEmotes(userId);
              await fetchBTTVEmotes(userId);
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
