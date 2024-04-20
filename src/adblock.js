/* eslint no-redeclare: 0 */
/* global fetch:writable */
import { configRead } from './config';
import { showNotification } from './ui';

const origParse = JSON.parse;
JSON.parse = function () {
  const r = origParse.apply(this, arguments);

  if (!configRead('enableAdBlock')) {
    return r;
  }

  if (r.CLASS && r.CLASS === 'twitch-stitched-ad' && r.DURATION) {
    const videoElement = document.querySelector('video');

    videoElement.muted = true;
    videoElement.style.display = 'none';

    const duration = parseFloat(r.DURATION);

    if (configRead('showBlockingAdsMessage')) {
      showNotification(
        'Muting ads for ' + Math.round(duration) + ' seconds',
        duration * 1000
      );
    }

    const adPodLength = parseInt(r['X-TV-TWITCH-AD-POD-LENGTH']);
    const adPodPosition = parseInt(r['X-TV-TWITCH-AD-POD-POSITION']);

    const isSingleAdPod = adPodLength === 1;
    const isLastAdInPod =
      adPodLength && adPodPosition && adPodLength - 1 - adPodPosition === 0;

    if (isSingleAdPod || !adPodLength || isLastAdInPod) {
      setTimeout(
        () => {
          videoElement.muted = false;
          videoElement.style.display = 'unset';
        },
        duration * 1000 + 50
      );
    }

    return r;
  }

  return r;
};
