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
  const API_FFZ = 'https://api.frankerfacez.com/v1';
  const CHAT_SELECTOR = 'main > aside';
  const MESSAGE_SELECTOR = 'r-1xq2hnv';

  // Global variables
  let emoteMap7tv = new Map();
  let emoteMapBttv = new Map();
  let emoteMapFfz = new Map();
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

  function applyBttvEmoteList(emotes) {
    emotes.forEach((emote) => {
      const url = `https://cdn.betterttv.net/emote/${emote.id}/${EMOTE_SIZE}.${emote.imageType}`;
      emoteMapBttv.set(emote.code, url);
    });
  }

  async function fetchBTTVGlobalEmotes() {
    try {
      const res = await fetch(`${API_BTTV}/emotes/global`);
      if (!res.ok) {
        return;
      }
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        return;
      }
      applyBttvEmoteList(data);
    } catch (err) {
      console.error('[BTTV global] Error al obtener emotes:', err);
    }
  }

  async function fetchBTTVEmotes(userId) {
    try {
      await fetchBTTVGlobalEmotes();

      const res = await fetch(`${API_BTTV}/users/twitch/${userId}`);

      if (!res.ok) {
        return;
      }
      const data = await res.json();

      const emotes = [
        ...(data.sharedEmotes || []),
        ...(data.channelEmotes || [])
      ];
      applyBttvEmoteList(emotes);

      if (emoteMapBttv.size > 0) {
        showNotification('BTTV emotes loaded successfully!');
      }
    } catch (err) {
      console.error('[BTTV] Error al obtener emotes:', err);
    }
  }

  function ingestFfzSets(setsRoot) {
    if (!setsRoot?.sets) {
      return;
    }
    const { sets } = setsRoot;
    let setIds;
    if (Array.isArray(setsRoot.default_sets) && setsRoot.default_sets.length > 0) {
      setIds = setsRoot.default_sets;
    } else if (setsRoot.room?.set != null) {
      setIds = [setsRoot.room.set];
    } else {
      setIds = Object.keys(sets);
    }

    for (const sid of setIds) {
      const set = sets[String(sid)];
      if (!set?.emoticons) {
        continue;
      }
      for (const emo of set.emoticons) {
        if (emo.hidden || emo.modifier) {
          continue;
        }
        const url = emo.urls?.['2'] || emo.urls?.['1'];
        if (url && emo.name) {
          emoteMapFfz.set(emo.name, url);
        }
      }
    }
  }

  async function fetchFFZEmotes(channelLogin) {
    try {
      const globalRes = await fetch(`${API_FFZ}/set/global`);
      if (globalRes.ok) {
        const globalData = await globalRes.json();
        ingestFfzSets(globalData);
      }

      const roomRes = await fetch(
        `${API_FFZ}/room/${encodeURIComponent(channelLogin)}`
      );
      if (roomRes.ok) {
        const roomData = await roomRes.json();
        if (roomData.sets && roomData.room) {
          ingestFfzSets(roomData);
        }
      }

      if (emoteMapFfz.size > 0) {
        showNotification('FFZ emotes loaded successfully!');
      }
    } catch (err) {
      console.error('[FFZ] Error al obtener emotes:', err);
    }
  }

  function replaceEmotes(text) {
    if (!text) return text;

    let replacedText = text;
    // Replace emote names using a split-and-rebuild approach to avoid regex issues
    if (
      emoteMap7tv.size === 0 &&
      emoteMapBttv.size === 0 &&
      emoteMapFfz.size === 0
    ) {
      return replacedText;
    }

    // Build a Set of emote names for fast lookup

    // Split text into words and non-word separators
    const parts = replacedText.split(/(\s+)/);

    // Replace each part that matches an emote name
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const url7tv = emoteMap7tv.get(part);
      const urlBttv = emoteMapBttv.get(part);
      const urlFfz = emoteMapFfz.get(part);
      const url = url7tv || urlBttv || urlFfz;
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
        emoteMapFfz = new Map();

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
              await fetchFFZEmotes(currentChannelLogin);
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
