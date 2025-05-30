export const CONFIG_KEY = 'taf-configuration';
export const ENABLE_AD_BLOCK = 'enableAdBlock';
export const DISABLE_ANIMATIONS = 'disableAnimations';
export const SHOW_CLAIM_POINTS_MESSAGE = 'showClaimPointsMessage';
export const SHOW_BLOCKING_ADS_MESSAGE = 'showBlockingAdsMessage';
export const LOAD_EMOTES = 'loadEmotes';

export const configOptions = new Map([
  [ENABLE_AD_BLOCK, { default: true, desc: 'Mute and hide ads' }],
  [
    DISABLE_ANIMATIONS,
    { default: true, desc: 'Disable animations (for better performance)' }
  ],
  [
    SHOW_CLAIM_POINTS_MESSAGE,
    { default: true, desc: 'Show a message when claiming community points' }
  ],
  [
    SHOW_BLOCKING_ADS_MESSAGE,
    { default: true, desc: 'Show a message while blocking ads' }
  ],
  [LOAD_EMOTES, { default: true, desc: 'Load emotes (7TV, BTTV)' }]
]);
