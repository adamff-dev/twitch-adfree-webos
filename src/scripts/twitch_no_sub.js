// ==UserScript==
// @name         TwitchNoSub
// @namespace    https://github.com/besuper/TwitchNoSub
// @version      1.1.1
// @description  Watch sub only VODs on Twitch
// @author       besuper
// @updateURL    https://raw.githubusercontent.com/besuper/TwitchNoSub/master/userscript/twitchnosub.user.js
// @downloadURL  https://raw.githubusercontent.com/besuper/TwitchNoSub/master/userscript/twitchnosub.user.js
// @icon         https://raw.githubusercontent.com/besuper/TwitchNoSub/master/assets/icons/icon.png
// @match        *://*.twitch.tv/*
// @run-at       document-end
// @inject-into  page
// @grant        none

// ==/UserScript==

const patchAmazonWorkerUrl =
  'https://cdn.jsdelivr.net/gh/adamff-dev/twitch-adfree-webos/src/scripts/patch_amazonworker.js';

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

      const blobUrl = URL.createObjectURL(
        new Blob([
          `
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
