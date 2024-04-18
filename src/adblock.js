/* eslint no-redeclare: 0 */
/* global fetch:writable */
import { configRead } from './config';
import { showNotification } from './ui';

const AD_CLASSES = [
  'twitch-stitched-ad',
  'twitch-ad-quartile',
  'twitch-stream-source'
];

const origParse = JSON.parse;
JSON.parse = function () {
  const r = origParse.apply(this, arguments);
  if (!configRead('enableAdBlock')) {
    return r;
  }

  if (r.CLASS && (AD_CLASSES.includes(r.CLASS) || r.CLASS.contains('ad'))) {
    if (configRead('showBlockingAdsMessage')) {
      showNotification('Blocking ads...');
    }
    console.log('BLOCKING ADS');
    console.log('Blocked request class:', r.CLASS);
    setNull(r);
  }

  return r;
};

function setAll(obj, val) {
  Object.keys(obj).forEach(function (index) {
    obj[index] = val;
  });
}

function setNull(obj) {
  setAll(obj, null);
}
