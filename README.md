# Twitch AdFree

A webOS application for Twitch that hides and mutes ads, automatically claims channel points and unlocks sub-only VODs.

Based on [youtube-webos](https://github.com/webosbrew/youtube-webos)

## Features

- Hides and mutes ads
- Automatically claims community points during streams
- View sub-only VODs without a subscription
- Disable animations to improve performance
- You can now navigate through the top navigation buttons using the number keys 1 to 4:
  - 1️⃣ — Home
  - 2️⃣ — Following
  - 3️⃣ — Browse
  - 4️⃣ — Search

**Note:** Configuration screen can be opened by pressing 🟩 GREEN button on the remote.

## Contribution

We welcome contributions of any kind — code, documentation, bug reports, or feature suggestions.

If you find this project helpful and want to support its development, consider making a donation.

Your support helps keep the project active and maintained. Thank you! 🙌

<a href="https://www.buymeacoffee.com/rSiZtB3"><img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=☕&slug=rSiZtB3&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" /></a>

## Installation

- Use [Device Manager app](https://github.com/webosbrew/dev-manager-desktop) - see [Releases](https://github.com/adamff-dev/twitch-adfree-webos/releases) for a
  prebuilt `.ipk` binary file
- Use [webOS TV CLI tools](https://webostv.developer.lge.com/develop/tools/cli-installation) -
  `ares-install twitch...ipk` (for webOS CLI tools configuration see below)

## Configuration

Configuration screen can be opened by pressing 🟩 GREEN button on the remote.

### Autostart

In order to autostart an application the following command needs to be executed
via SSH or Telnet:

```sh
luna-send-pub -n 1 'luna://com.webos.service.eim/addDevice' '{"appId":"twitch.adamffdev.v1","pigImage":"","mvpdIcon":""}'
```

This will make "Twitch AdFree" display as an eligible input application (next
to HDMI/Live TV, etc...), and, if it was the last selected input, it will be
automatically launched when turning on the TV.

This will also greatly increase startup performance, since it will be runnning
constantly in the background, at the cost of increased idle memory usage.
(so far, relatively unnoticable in normal usage)

In order to disable autostart run this:

```sh
luna-send-pub -n 1 'luna://com.webos.service.eim/deleteDevice' '{"appId":"twitch.adamffdev.v1"}'
```

## Building

- Clone the repository

```sh
git clone https://github.com/adamff-dev/twitch-adfree-webos.git
```

- Enter the folder and build the App, this will generate a `*.ipk` file.

```sh
cd twitch-adfree

# Install dependencies (need to do this only when updating local repository / package.json is changed)
npm install

npm run build && npm run package
```

## Development TV setup

### Configuring webOS TV CLI tools with Developer Mode App

This is partially based on: https://webostv.developer.lge.com/develop/getting-started/developer-mode-app

- Install Developer Mode app from Content Store
- Enable developer mode, enable keyserver
- Download TV's private key: `http://TV_IP:9991/webos_rsa`
- Configure the device using `ares-setup-device` (`-a` may need to be replaced with `-m` if device named `webos` is already configured)
  - `PASSPHRASE` is the 6-character passphrase printed on screen in developer mode app

```sh
ares-setup-device -a webos -i "username=prisoner" -i "privatekey=/path/to/downloaded/webos_rsa" -i "passphrase=PASSPHRASE" -i "host=TV_IP" -i "port=9922"
```

- Modify device info:

```sh
ares-setup-device --modify emulator --info "host=TV_IP"
```

### Configuring webOS TV CLI tools with Homebrew Channel / root

- Enable sshd in Homebrew Channel app
- Generate ssh key on developer machine (`ssh-keygen`)
- Copy the public key (`id_rsa.pub`) to `/home/root/.ssh/authorized_keys` on TV
- Configure the device using `ares-setup-device` (`-a` may need to be replaced with `-m` if device named `webos` is already configured)

```sh
ares-setup-device -a webos -i "username=root" -i "privatekey=/path/to/id_rsa" -i "passphrase=SSH_KEY_PASSPHRASE" -i "host=TV_IP" -i "port=22"
```

## Installation

```
npm run deploy
```

## Launching

- The app will be available in the TV's app list or launch it using ares-cli.

```sh
npm run launch
```

## Build, deploy and launch

The following one-liner is convenient for debugging because it chains together all the essential steps — building, packaging, deploying, and launching — into a single command:

```sh
pnpm run build && pnpm run package && pnpm run deploy && pnpm run launch
```
