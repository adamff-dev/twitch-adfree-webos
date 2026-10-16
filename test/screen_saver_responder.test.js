import assert from 'node:assert/strict';
import test from 'node:test';

let importId = 0;
const loadResponder = () =>
  import(`../src/scripts/screen_saver_responder.js?test=${++importId}`);

async function setup(t) {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  t.after(() => {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  });

  const listeners = {};
  class Bridge {
    calls = [];
    cancelled = false;
    call(uri, payload) {
      this.calls.push({ uri, payload: JSON.parse(payload) });
    }
    cancel() {
      this.cancelled = true;
    }
  }
  const document = {
    hidden: false,
    videos: [{ paused: false, ended: false, readyState: 4 }],
    querySelectorAll(selector) {
      assert.equal(selector, 'video');
      return this.videos;
    }
  };
  globalThis.window = {
    WebOSServiceBridge: Bridge,
    addEventListener: (name, callback) => {
      listeners[name] = callback;
    }
  };
  globalThis.document = document;
  await loadResponder();
  const state = globalThis.window.__tafScreenSaver;
  return {
    document,
    state,
    listeners,
    send: (message) =>
      state.subscription.onservicecallback(JSON.stringify(message))
  };
}

test('vetoes timestamp-only webOS 4.x requests with the matching client and timestamp', async (t) => {
  const { state, send } = await setup(t);
  assert.deepEqual(state.subscription.calls, [
    {
      uri: 'luna://com.webos.service.tvpower/power/registerScreenSaverRequest',
      payload: { subscribe: true, clientName: state.clientName }
    }
  ]);
  send({ returnValue: true, subscribed: true });
  assert.equal(state.response.calls.length, 0);
  send({ returnValue: true, timestamp: '1596401564', instantBoot: 'on' });
  assert.deepEqual(state.response.calls, [
    {
      uri: 'luna://com.webos.service.tvpower/power/responseScreenSaverRequest',
      payload: {
        clientName: state.clientName,
        ack: false,
        timestamp: '1596401564'
      }
    }
  ]);
});

test('handles repeated state-bearing requests without replacing the subscription', async (t) => {
  const { state, send } = await setup(t);
  for (const timestamp of ['first', 'second', 'third']) {
    send({ state: 'Active', timestamp });
  }
  assert.deepEqual(
    state.response.calls.map(({ payload }) => payload.timestamp),
    ['first', 'second', 'third']
  );
  assert.equal(state.subscription.calls.length, 1);
  assert.notEqual(state.subscription, state.response);
});

test('allows screensaver without foreground playback and checks all video elements', async (t) => {
  const { document, state, send } = await setup(t);
  for (const videos of [
    [],
    [{ paused: true, ended: false, readyState: 4 }],
    [{ paused: false, ended: true, readyState: 4 }],
    [{ paused: false, ended: false, readyState: 0 }]
  ]) {
    document.videos = videos;
    send({ timestamp: 'idle' });
  }
  assert.equal(state.response.calls.length, 0);
  document.videos = [
    { paused: true, ended: false, readyState: 4 },
    { paused: false, ended: false, readyState: 4 }
  ];
  document.hidden = true;
  send({ timestamp: 'background' });
  assert.equal(state.response.calls.length, 0);
  document.hidden = false;
  send({ timestamp: 'playing' });
  assert.equal(state.response.calls.length, 1);
});

test('ignores malformed messages and service errors', async (t) => {
  const { state, send } = await setup(t);
  state.subscription.onservicecallback('invalid JSON');
  send(null);
  send({ returnValue: false, timestamp: 'error' });
  send({ returnValue: true });
  assert.equal(state.response.calls.length, 0);
});

test('registers once per document and cancels both connections on unload', async (t) => {
  const { state, listeners } = await setup(t);
  await loadResponder();
  assert.equal(globalThis.window.__tafScreenSaver, state);
  assert.equal(state.subscription.calls.length, 1);
  assert.match(state.clientName, /^twitch\.adamffdev\.v1\.[a-z0-9]+$/);
  listeners.unload();
  assert.equal(state.subscription.cancelled, true);
  assert.equal(state.response.cancelled, true);
});
