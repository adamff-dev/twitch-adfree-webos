import { configRead, configAddChangeListener } from '../config.js';
import { ENABLE_LOW_LATENCY } from '../constants/config.constants.js';

// Low Latency Variables
let curVideo = null;
let minDiff = 9999;
let diff = 0;
let avgAboveDiff = 0;
let banner = null;
let lowLatencyEnabled = false;
let showBanner = true;
let lowLatencyInterval = null;

/**
 * Find and set the current video element
 */
function checkCurVideo() {
  const videos = document.querySelectorAll('video');
  if (videos.length === 1) {
    curVideo = videos[0];
  } else {
    curVideo = null;
  }
}

/**
 * Create the latency banner element
 */
function createLatencyBanner() {
  if (banner) return;

  banner = document.createElement('div');
  banner.className = 'taf-low-latency-banner';

  banner.innerHTML = 'Delay: <span class="taf-latency-value"></span>s';

  document.body.appendChild(banner);
}

/**
 * Initialize low latency mode on the current video
 */
function initializeLowLatency() {
  checkCurVideo();
  if (curVideo && lowLatencyEnabled) {
    try {
      // Wait until buffer is ready before jumping to live edge
      function waitForBuffer() {
        if (curVideo.buffered.length > 0) {
          curVideo.currentTime = curVideo.buffered.end(0);

          // Reset stats
          function checkMinDiff() {
            setTimeout(() => {
              if (diff <= 0) {
                checkMinDiff();
              }
              minDiff = diff;
              avgAboveDiff = 0;
            }, 5000);
          }
          checkMinDiff();
        } else {
          // Buffer not ready yet, check again in 100ms
          setTimeout(waitForBuffer, 5000);
        }
      }
      waitForBuffer();
    } catch (err) {
      console.warn('Error initializing low latency:', err);
    }
  }
}

/**
 * Check latency and update banner
 */
function checkLatency() {
  if (!lowLatencyEnabled) return;

  checkCurVideo();

  if (curVideo) {
    try {
      if (curVideo.buffered.length > 0) {
        diff = curVideo.buffered.end(0) - curVideo.currentTime;

        if (diff > 0) {
          if (diff < minDiff) {
            minDiff = diff;
          }

          let shouldShowBanner = false;

          // Show banner if delay is significant
          if (diff > 3 && (diff > minDiff * 2 || diff > 15)) {
            if (diff + 1 > avgAboveDiff) {
              if (showBanner && banner) {
                const videoPos = curVideo.getBoundingClientRect();
                banner.style.left = videoPos.left + 'px';
                banner.style.top = videoPos.top + 'px';
                banner.style.display = 'block';

                const diffRound = Math.round(diff * 10) / 10;
                const latencyValueElement =
                  banner.querySelector('.taf-latency-value');
                if (latencyValueElement) {
                  latencyValueElement.textContent = diffRound;
                }
                shouldShowBanner = true;
              }
            }
            avgAboveDiff = (avgAboveDiff + diff) / 2;
          }

          if (!shouldShowBanner && banner) {
            banner.style.display = 'none';
          }
        }
      }
    } catch (err) {
      console.warn('Error checking latency:', err);
    }
  }
}

/**
 * Start the low latency monitoring
 */
function startLowLatencyMonitoring() {
  if (lowLatencyInterval) return;

  // Initialize immediately
  initializeLowLatency();

  // Check every second
  lowLatencyInterval = setInterval(() => {
    checkLatency();
  }, 5000);
}

/**
 * Stop the low latency monitoring
 */
function stopLowLatencyMonitoring() {
  if (lowLatencyInterval) {
    clearInterval(lowLatencyInterval);
    lowLatencyInterval = null;
  }

  if (banner) {
    banner.style.display = 'none';
  }

  // Reset variables
  minDiff = 9999;
  diff = 0;
  avgAboveDiff = 0;
}

/**
 * Update low latency state based on configuration
 */
function updateLowLatencyState() {
  const enabled = configRead(ENABLE_LOW_LATENCY);

  lowLatencyEnabled = enabled;

  if (lowLatencyEnabled) {
    if (!banner) {
      createLatencyBanner();
    }
    startLowLatencyMonitoring();
  } else {
    stopLowLatencyMonitoring();
  }
}

/**
 * Initialize the low latency feature
 */
function initLowLatency() {
  // Create banner element
  createLatencyBanner();

  // Read initial configuration
  updateLowLatencyState();

  // Listen for configuration changes
  configAddChangeListener(ENABLE_LOW_LATENCY, () => {
    updateLowLatencyState();
  });

  // Re-initialize when video changes (e.g., switching streams)
  const observer = new MutationObserver(() => {
    if (lowLatencyEnabled) {
      checkCurVideo();
      if (curVideo && curVideo.buffered.length > 0) {
        // Video might have changed, reset stats
        minDiff = 9999;
        avgAboveDiff = 0;
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLowLatency);
} else {
  initLowLatency();
}
