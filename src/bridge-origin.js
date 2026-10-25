const chromeExtensionOrigin = /^chrome-extension:\/\/[a-p]{32}$/;
const firefoxExtensionOrigin = /^moz-extension:\/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isAllowedBridgeOrigin(origin) {
  if (!origin) return true;
  return chromeExtensionOrigin.test(origin) || firefoxExtensionOrigin.test(origin);
}
