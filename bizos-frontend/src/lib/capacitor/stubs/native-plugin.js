/**
 * Proxy-based stub for native-only Capacitor plugins (Vercel / web builds).
 *
 * The webpack alias in next.config.js maps packages like @capacitor/local-notifications,
 * @capacitor/push-notifications, @capacitor/app, and @aparajita/capacitor-biometric-auth
 * to this file when BUILD_TARGET !== 'android'.
 *
 * When server.url is set, Capacitor.isNativePlatform() returns true inside the Android
 * WebView even though the JS bundle came from Vercel (and therefore has stubs). Without
 * this Proxy, named imports like `const { LocalNotifications } = await import(...)`
 * resolve to undefined, and any method call crashes the app with a client-side exception.
 *
 * The Proxy makes every named export a no-op object whose methods return resolved promises,
 * so all plugin calls silently succeed without doing anything.
 */

const makeNoOp = () =>
  new Proxy(
    {},
    {
      get(_target, prop) {
        // Prevent accidental Promise-like treatment
        if (prop === 'then') return undefined;
        // Every method returns a resolved promise with an empty result
        return () => Promise.resolve({});
      },
    },
  );

const handler = {
  get(_target, prop) {
    if (prop === '__esModule') return true;
    if (prop === 'default') return makeNoOp();
    // Named exports: LocalNotifications, PushNotifications, App, BiometricAuth, etc.
    return makeNoOp();
  },
};

module.exports = new Proxy({}, handler);
