export const CONFIG_KEY = 'taf-configuration';
export const ENABLE_AD_BLOCK = 'enableAdBlock';
export const DISABLE_ANIMATIONS = 'disableAnimations';
export const SHOW_CLAIM_POINTS_MESSAGE = 'showClaimPointsMessage';
export const LOAD_EMOTES = 'loadEmotes';
export const ENABLE_CHAT_OVERLAY = 'enableChatOverlay';
export const CHAT_POSITION = 'chatPosition';
export const CHAT_OVERLAY_WIDTH = 'chatOverlayWidth';
export const CHAT_OVERLAY_HEIGHT = 'chatOverlayHeight';
export const CHAT_OVERLAY_FONT_SIZE = 'chatOverlayFontSize';
export const CHAT_OVERLAY_TRANSPARENCY = 'chatOverlayTransparency';
export const ENABLE_LOW_LATENCY = 'enableLowLatency';
export const USE_CUSTOM_PROXY = 'useCustomProxy';
export const ACTION_RESET_CONFIG = 'actionResetConfig';

export const configOptions = {
  [ENABLE_LOW_LATENCY]: {
    default: false,
    desc: 'Enable low latency mode (experimental)'
  },
  [USE_CUSTOM_PROXY]: {
    default: false,
    desc: 'Use luminous.dev for HLS playlist streaming'
  },
  [ENABLE_AD_BLOCK]: { default: true, desc: 'Mute and hide ads automatically' },
  [DISABLE_ANIMATIONS]: {
    default: true,
    desc: 'Turn off UI animations for improved performance'
  },
  [SHOW_CLAIM_POINTS_MESSAGE]: {
    default: true,
    desc: 'Display a notification when channel points are claimed'
  },
  [LOAD_EMOTES]: {
    default: true,
    desc: 'Enable loading of 7TV and BTTV emotes in chat'
  },
  [ENABLE_CHAT_OVERLAY]: {
    default: true,
    desc: 'Display chat as a transparent overlay on top of the video'
  },
  [CHAT_POSITION]: {
    default: 'Bottom Right',
    desc: 'Chat position'
  },
  [CHAT_OVERLAY_WIDTH]: {
    default: 380,
    desc: 'Chat overlay width in pixels'
  },
  [CHAT_OVERLAY_HEIGHT]: {
    default: 100,
    desc: 'Chat overlay height in percent'
  },
  [CHAT_OVERLAY_FONT_SIZE]: {
    default: 25,
    desc: 'Chat text size in pixels'
  },
  [CHAT_OVERLAY_TRANSPARENCY]: {
    default: 50,
    desc: 'Chat overlay background transparency (0-100%)'
  },
  [ACTION_RESET_CONFIG]: {
    default: null,
    desc: 'Reset configuration to defaults'
  }
};
