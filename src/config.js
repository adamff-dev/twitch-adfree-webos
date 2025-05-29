import { CONFIG_KEY, configOptions } from './constants/config.constants';

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
    return JSON.parse(storage);
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
