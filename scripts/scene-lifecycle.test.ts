import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const plugin = require('../plugins/with-scene-lifecycle.js') as {
  adoptSceneLifecycle(source: string): string;
  addSceneManifest(plist: Record<string, unknown>): Record<string, unknown>;
};

// The shape `expo prebuild` generates for SDK 57 (window created in the app delegate).
const GENERATED = `@main
class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
`;

describe('adoptSceneLifecycle', () => {
  it('lets the scene delegate find the React Native factory', () => {
    expect(plugin.adoptSceneLifecycle(GENERATED)).toContain(
      'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {',
    );
  });

  it('stops the app delegate from creating its own window', () => {
    const out = plugin.adoptSceneLifecycle(GENERATED);
    expect(out).not.toContain('UIWindow(frame:');
    expect(out).not.toContain('factory.startReactNative(');
    expect(out).toContain('reactNativeFactory = factory');
    expect(out).toContain('return super.application(application, didFinishLaunchingWithOptions: launchOptions)');
  });

  it('changes nothing the second time', () => {
    const once = plugin.adoptSceneLifecycle(GENERATED);
    expect(plugin.adoptSceneLifecycle(once)).toBe(once);
  });

  it('refuses an app delegate it does not recognise, so a crashing build is not shipped silently', () => {
    expect(() => plugin.adoptSceneLifecycle('class AppDelegate: Something {}')).toThrow(/AppDelegate/);
  });
});

describe('addSceneManifest', () => {
  it("declares one window scene run by Expo's scene delegate", () => {
    const plist = plugin.addSceneManifest({ CFBundleName: 'Tell Liora' });
    expect(plist).toMatchObject({
      CFBundleName: 'Tell Liora',
      UIApplicationSceneManifest: {
        UIApplicationSupportsMultipleScenes: false,
        UISceneConfigurations: {
          UIWindowSceneSessionRoleApplication: [
            { UISceneConfigurationName: 'Default Configuration', UISceneDelegateClassName: 'EXExpoAppSceneDelegate' },
          ],
        },
      },
    });
  });
});
