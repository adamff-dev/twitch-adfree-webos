export const CONFIG_KEY = 'taf-configuration';
export const ENABLE_AD_BLOCK = 'enableAdBlock';
export const DISABLE_ANIMATIONS = 'disableAnimations';
export const SHOW_CLAIM_POINTS_MESSAGE = 'showClaimPointsMessage';
export const SHOW_CURRENT_POINTS = 'showCurrentPoints';
export const SHOW_BLOCKING_ADS_MESSAGE = 'showBlockingAdsMessage';
export const LOAD_EMOTES = 'loadEmotes';

export const configOptions = {
  [ENABLE_AD_BLOCK]: { default: true, desc: 'Mute and hide ads automatically' },
  [DISABLE_ANIMATIONS]: {
    default: true,
    desc: 'Turn off UI animations for improved performance'
  },
  [SHOW_BLOCKING_ADS_MESSAGE]: {
    default: true,
    desc: 'Display a message while ads are being blocked'
  },
  [SHOW_CLAIM_POINTS_MESSAGE]: {
    default: true,
    desc: 'Display a notification when channel points are claimed'
  },
  [SHOW_CURRENT_POINTS]: {
    default: true,
    desc: 'Show your current channel points in the claim notification'
  },
  [LOAD_EMOTES]: {
    default: true,
    desc: 'Enable loading of 7TV and BTTV emotes in chat'
  }
};
