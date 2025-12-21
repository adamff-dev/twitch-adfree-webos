import { configRead } from '../config';
import {
  CUSTOM_PROXY_URL,
  USE_CUSTOM_PROXY
} from '../constants/config.constants';
import { APP_VERSION } from '../constants/global.constants';

const patchAmazonWorkerUrl =
  'https://adamff-dev.github.io/twitch-adfree-webos/src/scripts/patch_amazon_worker.js?v=' +
  APP_VERSION; // For cache busting

(function () {
  // From vaft script (https://github.com/pixeltris/TwitchAdSolutions/blob/master/vaft/vaft.user.js#L299)
  function getWasmWorkerJs(twitchBlobUrl) {
    let req = new XMLHttpRequest();
    req.open('GET', twitchBlobUrl, false);
    req.overrideMimeType('text/javascript');
    req.send();
    return req.responseText;
  }

  const oldWorker = window.Worker;

  window.Worker = class Worker extends oldWorker {
    constructor(twitchBlobUrl) {
      let workerString = getWasmWorkerJs(
        `${twitchBlobUrl.replace(/'/g, '%27')}`
      );

      const useProxy = configRead(USE_CUSTOM_PROXY);
      const proxyUrl = configRead(CUSTOM_PROXY_URL);

      const blobUrl = URL.createObjectURL(
        new Blob([
          `
            useProxy = ${useProxy};
            proxyUrl = '${proxyUrl}';

            importScripts(
              '${patchAmazonWorkerUrl}',
            );

            ${workerString}
        `
        ])
      );
      super(blobUrl);
    }
  };
})();

/**
 * Force babel to interpret this file as ESM so it
 * polyfills with ESM imports instead of CommonJS.
 */
export {};
