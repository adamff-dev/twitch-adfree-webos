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
export const MAX_PROXY_SERVERS = 5;
/**
 * Default proxy servers. These are URL-prefix proxies: the full Twitch HLS URL
 * (query string included) is appended to the server base.
 */
export const PROXY_SERVERS = [
  'https://proxy4.rte.net.ru/',
  'https://proxy7.rte.net.ru/',
  'https://proxy5.rte.net.ru/',
  'https://proxy6.rte.net.ru/'
];
export const PROXY_SERVER_1 = 'proxyServer1';
export const PROXY_SERVER_2 = 'proxyServer2';
export const PROXY_SERVER_3 = 'proxyServer3';
export const PROXY_SERVER_4 = 'proxyServer4';
export const PROXY_SERVER_5 = 'proxyServer5';
export const PROXY_SERVER_KEYS = [
  PROXY_SERVER_1,
  PROXY_SERVER_2,
  PROXY_SERVER_3,
  PROXY_SERVER_4,
  PROXY_SERVER_5
];
export const ACTION_RESET_CONFIG = 'actionResetConfig';

export const configOptions = {
  [ENABLE_LOW_LATENCY]: {
    default: false,
    desc: 'Enable low latency mode (experimental)'
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
    desc: 'Enable loading of 7TV, BTTV, and FFZ emotes in chat'
  },
  [ENABLE_CHAT_OVERLAY]: {
    default: true,
    desc: 'Display chat as a transparent overlay on top of the video'
  },
  [CHAT_POSITION]: {
    default: 'Bottom Right',
    options: ['Top Left', 'Top Right', 'Bottom Left', 'Bottom Right'],
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
  [USE_CUSTOM_PROXY]: {
    default: true,
    desc: 'Use proxy servers for HLS streaming (experimental)'
  },
  [PROXY_SERVER_1]: { default: PROXY_SERVERS[0], desc: 'Proxy server 1' },
  [PROXY_SERVER_2]: { default: PROXY_SERVERS[1], desc: 'Proxy server 2' },
  [PROXY_SERVER_3]: { default: PROXY_SERVERS[2], desc: 'Proxy server 3' },
  [PROXY_SERVER_4]: { default: PROXY_SERVERS[3], desc: 'Proxy server 4' },
  [PROXY_SERVER_5]: { default: PROXY_SERVERS[4] ?? '', desc: 'Proxy server 5' },
  [ACTION_RESET_CONFIG]: {
    default: null,
    desc: 'Reset configuration to defaults'
  }
};
