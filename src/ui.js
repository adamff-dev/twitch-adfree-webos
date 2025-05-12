/*global navigate*/
import './lib/spatial-navigation-polyfill.js';
import {
  configAddChangeListener,
  configRead,
  configWrite,
  configGetDesc
} from './config.js';
import './ui.css';

// Constants for selectors
const rejectCookiesSelector =
  '[role="dialog"] > div:last-child button:first-child';
const acceptAdultContentButtonSelector =
  'div:has(svg[role="presentation"]) > div:last-child button:first-child';
const bannerAdSelector = '.r-2dbvay';

// We handle key events ourselves.
window.__spatialNavigation__.keyMode = 'NONE';

const ARROW_KEY_CODE = { 37: 'left', 38: 'up', 39: 'right', 40: 'down' };

// Red, Green, Yellow, Blue
// 403,   404,    405,  406
// ---,   172,    170,  191
const colorCodeMap = new Map([
  [403, 'red'],

  [404, 'green'],
  [172, 'green'],

  [405, 'yellow'],
  [170, 'yellow'],

  [406, 'blue'],
  [191, 'blue']
]);

/**
 * Returns the name of the color button associated with a code or null if not a color button.
 * @param {number} keyCode KeyboardEvent.keyCode property from event
 * @returns {string | null} Color name or null
 */
function getKeyColor(keyCode) {
  if (colorCodeMap.has(keyCode)) {
    return colorCodeMap.get(keyCode);
  }

  return null;
}

function createConfigCheckbox(key) {
  const elmInput = document.createElement('input');
  elmInput.type = 'checkbox';
  elmInput.checked = configRead(key);

  /** @type {(evt: Event) => void} */
  const changeHandler = (evt) => {
    configWrite(key, evt.target.checked);
  };

  elmInput.addEventListener('change', changeHandler);

  configAddChangeListener(key, (evt) => {
    elmInput.checked = evt.detail.newValue;
  });

  const elmLabel = document.createElement('label');
  elmLabel.appendChild(elmInput);
  // Use non-breaking space (U+00A0)
  elmLabel.appendChild(document.createTextNode('\u00A0' + configGetDesc(key)));

  return elmLabel;
}

function createOptionsPanel() {
  const elmContainer = document.createElement('div');

  elmContainer.classList.add('taf-ui-container');
  elmContainer.style['display'] = 'none';
  elmContainer.setAttribute('tabindex', 0);

  elmContainer.addEventListener(
    'focus',
    () => console.info('Options panel focused!'),
    true
  );
  elmContainer.addEventListener(
    'blur',
    () => console.info('Options panel blurred!'),
    true
  );

  elmContainer.addEventListener(
    'keydown',
    (evt) => {
      console.info('Options panel key event:', evt.type, evt.keyCode);

      if (getKeyColor(evt.keyCode) === 'green') {
        return;
      }

      if (evt.keyCode in ARROW_KEY_CODE) {
        navigate(ARROW_KEY_CODE[evt.keyCode]);
      } else if (evt.keyCode === 13) {
        // Enter key
        document.activeElement.click();
      }

      evt.preventDefault();
      evt.stopPropagation();
    },
    true
  );

  const elmHeading = document.createElement('h1');
  elmHeading.textContent = 'Twitch AdFree Settings';
  elmContainer.appendChild(elmHeading);
  const elmBody = document.createElement('p');
  elmBody.textContent = 'Press [GREEN] button again to close configuration';
  elmContainer.appendChild(elmBody);

  elmContainer.appendChild(createConfigCheckbox('enableAdBlock'));
  elmContainer.appendChild(createConfigCheckbox('disableAnimations'));
  elmContainer.appendChild(createConfigCheckbox('showBlockingAdsMessage'));

  const elmBlock = document.createElement('blockquote');

  elmContainer.appendChild(elmBlock);

  return elmContainer;
}

const optionsPanel = createOptionsPanel();
document.body.appendChild(optionsPanel);

let optionsPanelVisible = false;

/**
 * Show or hide the options panel.
 * @param {boolean} [visible=true] Whether to show the options panel.
 */
function showOptionsPanel(visible) {
  visible ??= true;

  if (visible && !optionsPanelVisible) {
    console.info('Showing and focusing options panel!');
    optionsPanel.style.display = 'block';
    optionsPanel.focus();
    optionsPanelVisible = true;
  } else if (!visible && optionsPanelVisible) {
    console.info('Hiding options panel!');
    optionsPanel.style.display = 'none';
    optionsPanel.blur();
    optionsPanelVisible = false;
  }
}

window.taf_showOptionsPanel = showOptionsPanel;

const eventHandler = (evt) => {
  console.info('Key event:', evt.type, evt.keyCode, evt.defaultPrevented);

  if (getKeyColor(evt.keyCode) === 'green') {
    console.info('Taking over!');

    evt.preventDefault();
    evt.stopPropagation();

    if (evt.type === 'keydown') {
      // Toggle visibility.
      showOptionsPanel(!optionsPanelVisible);
    }
    return false;
  }
  return true;
};

document.addEventListener('keydown', eventHandler, true);
document.addEventListener('keypress', eventHandler, true);
document.addEventListener('keyup', eventHandler, true);

export function showNotification(text, time = 3000) {
  if (!document.querySelector('.taf-notification-container')) {
    console.info('Adding notification container');
    const c = document.createElement('div');
    c.classList.add('taf-notification-container');
    document.body.appendChild(c);
  }

  const elm = document.createElement('div');
  const elmInner = document.createElement('div');
  elmInner.innerText = text;
  elmInner.classList.add('message');
  elmInner.classList.add('message-hidden');
  elm.appendChild(elmInner);
  document.querySelector('.taf-notification-container').appendChild(elm);

  setTimeout(() => {
    elmInner.classList.remove('message-hidden');
  }, 100);
  setTimeout(() => {
    elmInner.classList.add('message-hidden');
    setTimeout(() => {
      elm.remove();
    }, 1000);
  }, time);
}

/**
 * Initialize ability to remove animations
 */
function initRemoveAnimations() {
  const style = document.createElement('style');
  document.head.appendChild(style);

  /** @type {(hide: boolean) => void} */
  const setHidden = (hide) => {
    style.textContent = hide ? '* { transition: none !important; }' : '';
  };

  setHidden(configRead('disableAnimations'));

  configAddChangeListener('disableAnimations', (evt) => {
    setHidden(evt.detail.newValue);
  });
}

function handleAdsAndConsentModals() {
  const enableAdBlock = configRead('enableAdBlock');

  const observer = new MutationObserver(() => {
    const adElement = document.querySelector(bannerAdSelector);
    const videoElement = document.querySelector('video');

    if (videoElement && enableAdBlock) {
      const isAdVisible = !!adElement;
      const shouldMute =
        isAdVisible &&
        (!videoElement.muted || videoElement.style.display !== 'none');
      const shouldUnmute =
        !isAdVisible &&
        (videoElement.muted || videoElement.style.display === 'none');

      if (shouldMute) {
        videoElement.muted = true;
        videoElement.style.display = 'none';
        showNotification('Muting and hiding ads', 7000);
      } else if (shouldUnmute) {
        videoElement.muted = false;
        videoElement.style.display = 'block';
      }
    }

    // Auto-reject cookies if the modal is present
    const rejectCookiesButton = document.querySelector(rejectCookiesSelector);
    if (rejectCookiesButton) {
      showNotification('Skipping cookie consent', 7000);
      rejectCookiesButton.click();
    }

    // Auto-accept adult content if the modal is present
    const acceptAdultContentButton = document.querySelector(
      acceptAdultContentButtonSelector
    );
    if (acceptAdultContentButton) {
      showNotification('Accepting adult content', 7000);
      acceptAdultContentButton.click();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

handleAdsAndConsentModals();
initRemoveAnimations();

setTimeout(() => {
  showNotification('Press [GREEN] button to open configuration', 5000);
}, 2000);
