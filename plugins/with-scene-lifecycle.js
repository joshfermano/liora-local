// iOS 27 stops apps that do not adopt the scene life cycle at launch. Expo 57 ships the scene
// delegate (EXExpoAppSceneDelegate) but its prebuild template still starts React Native from the
// app delegate, so this plugin switches the generated project over.
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const CLASS_LINE = 'class AppDelegate: ExpoAppDelegate {';
const CLASS_WITH_PROVIDER = 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {';
const WINDOW_START =
  /\n#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([\s\S]*?\)\n#endif\n/;

function adoptSceneLifecycle(source) {
  if (source.includes(CLASS_WITH_PROVIDER)) return source;
  if (!source.includes(CLASS_LINE) || !WINDOW_START.test(source)) {
    throw new Error('with-scene-lifecycle: the generated AppDelegate.swift has an unexpected shape; update the plugin');
  }
  return source
    .replace(CLASS_LINE, CLASS_WITH_PROVIDER)
    .replace(WINDOW_START, '\n    // EXExpoAppSceneDelegate creates the window and starts React Native.\n');
}

function addSceneManifest(plist) {
  return {
    ...plist,
    UIApplicationSceneManifest: {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          { UISceneConfigurationName: 'Default Configuration', UISceneDelegateClassName: 'EXExpoAppSceneDelegate' },
        ],
      },
    },
  };
}

function withSceneLifecycle(config) {
  config = withInfoPlist(config, (c) => {
    c.modResults = addSceneManifest(c.modResults);
    return c;
  });
  return withAppDelegate(config, (c) => {
    if (c.modResults.language !== 'swift') throw new Error('with-scene-lifecycle: expected a Swift AppDelegate');
    c.modResults.contents = adoptSceneLifecycle(c.modResults.contents);
    return c;
  });
}

module.exports = withSceneLifecycle;
module.exports.adoptSceneLifecycle = adoptSceneLifecycle;
module.exports.addSceneManifest = addSceneManifest;
