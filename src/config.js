import {
  CONFIG_KEY,
  PROXY_SERVER_1,
  configOptions
} from './constants/config.constants';

// The single `customProxyUrl` config was replaced by up to 5 `proxyServerN` slots.
const LEGACY_CUSTOM_PROXY_URL_KEY = 'customProxyUrl';
const LEGACY_LUMINOUS_CUSTOM_PROXY =
  'https://as.luminous.dev/live/$channel?allow_source=true&allow_audio_only=true&fast_bread=true';
const LEGACY_USHER_CUSTOM_PROXY =
  'https://usher.ttvnw.net/api/v2/channel/hls/$channel.m3u8';

function migrateLegacyCustomProxyUrl(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    return false;
  }
  const raw = parsed[LEGACY_CUSTOM_PROXY_URL_KEY];
  if (typeof raw !== 'string') {
    return false;
  }

  // Only carry over a user-provided value; the old defaults are dropped.
  const value = raw.trim();
  const wasDefault =
    value === '' ||
    value === LEGACY_LUMINOUS_CUSTOM_PROXY ||
    value === LEGACY_USHER_CUSTOM_PROXY;
  if (!wasDefault && !parsed[PROXY_SERVER_1]) {
    parsed[PROXY_SERVER_1] = raw;
  }
  delete parsed[LEGACY_CUSTOM_PROXY_URL_KEY];
  return true;
}

const defaultConfig = (() => {
  let ret = {};
  for (const k in configOptions) {
    ret[k] = configOptions[k].default;
  }
  return ret;
})();

/** @type {Record<string, DocumentFragment>} as const */
const configFrags = (() => {
  let ret = {};
  for (const k in configOptions) {
    ret[k] = new DocumentFragment();
  }
  return ret;
})();

function loadStoredConfig() {
  const storage = window.localStorage.getItem(CONFIG_KEY);

  if (storage === null) {
    return null;
  }

  try {
    const parsed = JSON.parse(storage);
    if (migrateLegacyCustomProxyUrl(parsed)) {
      window.localStorage.setItem(CONFIG_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch (err) {
    console.warn('Error parsing stored config:', err);
    return null;
  }
}

let localConfig = loadStoredConfig() ?? Object.create(defaultConfig);

function configExists(key) {
  return Object.hasOwn(configOptions, key);
}

export function configGetDesc(key) {
  if (!configExists(key)) {
    throw new Error('tried to get desc for unknown config key: ' + key);
  }

  return configOptions[key].desc;
}

export function configRead(key) {
  if (!configExists(key)) {
    throw new Error('tried to read unknown config key: ' + key);
  }

  if (localConfig[key] === undefined) {
    console.warn(
      'Populating key',
      key,
      'with default value',
      defaultConfig[key]
    );

    localConfig[key] = defaultConfig[key];
  }

  return localConfig[key];
}

export function configWrite(key, value) {
  if (!configExists(key)) {
    throw new Error('tried to write unknown config key: ' + key);
  }

  const oldValue =
    localConfig[key] !== undefined ? localConfig[key] : defaultConfig[key];

  localConfig[key] = value;
  window.localStorage[CONFIG_KEY] = JSON.stringify(localConfig);

  configFrags[key].dispatchEvent(
    new CustomEvent('tafConfigChange', {
      detail: { key, newValue: value, oldValue }
    })
  );
}

export function configAddChangeListener(key, callback) {
  const frag = configFrags[key];
  frag.addEventListener('tafConfigChange', callback);
}

export function configRemoveChangeListener(key, callback) {
  const frag = configFrags[key];
  frag.removeEventListener('tafConfigChange', callback);
}
