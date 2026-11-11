import assert from 'node:assert/strict';
import test from 'node:test';

let importId = 0;

async function launch(t, launchParams, search = '') {
  const previousWindow = globalThis.window;
  t.after(() => {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  });
  globalThis.window = {
    webOSSystem: { launchParams },
    location: { search, href: '' }
  };
  await import(`../src/index.js?test=${++importId}`);
  return globalThis.window.location.href;
}

test('opens the channel from launch params given as a JSON string', async (t) => {
  const href = await launch(
    t,
    '{\n    "channel": "eslcs",\n    "displayAffinity": 0\n}\n'
  );
  assert.equal(href, 'https://lg.tv.twitch.tv/eslcs');
});

test('opens the channel from launch params given as an object', async (t) => {
  const href = await launch(t, { channel: 'eslcs' });
  assert.equal(href, 'https://lg.tv.twitch.tv/eslcs');
});

test('falls back to the channel query parameter', async (t) => {
  const href = await launch(t, '{"displayAffinity": 0}', '?channel=eslcs');
  assert.equal(href, 'https://lg.tv.twitch.tv/eslcs');
});

test('opens the home page when the launch params are not JSON', async (t) => {
  const href = await launch(t, 'not json');
  assert.equal(href, 'https://lg.tv.twitch.tv/');
});
