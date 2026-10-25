# arRPC Changelog

## v1.0.1 - Firefox metadata and download guide
- Added Firefox `browser_specific_settings.gecko.data_collection_permissions.required: ["none"]` for the no-data-collection declaration required by the add-on submission flow.
- Updated the README to send users to the arRPC Browser download page rather than documenting Mozilla upload steps.
- Synced both extension manifests and package metadata to v1.0.1.

## v1.0.0 - Browser extension direction
- Replaced the Electron tray client with lightweight browser extension packages for Chromium-based browsers and Firefox.
- Uses the user's existing browser and Discord Web tab; no bundled Chromium runtime.
- Added a small Node.js helper setup guide, browser-specific packages, bridge-origin validation, and automated ZIP releases.
- Reworked the README for manual Chromium installation and Firefox Add-ons submission.

## Upstream arRPC history

The entries below describe the upstream arRPC code this repository builds upon.

## v3.7.0 [30-03-2026]
- Updated Discord's game database to latest version.

## v3.6.0 [28-09-2024]
- Updated Discord's game database to use the latest version.
- Updated dependencies to use the latest versions.

## v3.5.0 [30-08-2024]
- The bridge port is now configurable via the `ARRPC_BRIDGE_PORT` environment variable. ([#96](https://github.com/OpenAsar/arrpc/pull/96))
- Fixed some games by ignoring another 64 bit suffix. ([#107](https://github.com/OpenAsar/arrpc/pull/107))
- Fixed some account connecting being broken by adding a workaround for `CONNECTIONS_CALLBACK`. ([#106](https://github.com/OpenAsar/arrpc/pull/106))
- Updated Discord's game database to use the latest version.

## v3.4.0 [28-04-2024]
- Improved Linux process detection and fixed detectable DB loading for Node v22.

## v3.3.1 [13-02-2024]
- Fixed a bug crashing some RPC libraries.

## v3.3.0 [19-01-2024]
- Rewrote Linux game detection and updated the detectable database.

## v3.2.0 [13-08-2023]
- Added callback to invite events API and updated the database.
- Fixed refusing connections from Canary web.

## v3.1.0 [02-02-2023]
- Added Linux process scanning.

## v3.0.0 [26-11-2022]
- Added process scanning for detectable games.
- Improved RPC compatibility and bridge activity clearing.
