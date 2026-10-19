/**
 * iOS 27 refuses to launch apps built with the iOS 27 SDK that don't use the
 * UIScene lifecycle, and Expo 54's template creates its window in the
 * AppDelegate. This moves window creation into a SceneDelegate (appended to
 * AppDelegate.swift, so no Xcode project edits) and forwards URLs, universal
 * links and lifecycle events back to the AppDelegate so Expo modules and
 * RCTLinkingManager keep working.
 */
const { withAppDelegate, withInfoPlist } = require('@expo/config-plugins');

const WINDOW_SETUP =
  /\n#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([\s\S]*?\)\n#endif\n/;

const SCENE_DELEGATE = `
// Added by plugins/withSceneDelegate.js: iOS 27 requires the UIScene lifecycle.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?
  private var app: AppDelegate? { UIApplication.shared.delegate as? AppDelegate }

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene, let app else { return }
    let window = UIWindow(windowScene: windowScene)
    self.window = window
    app.window = window

    let url = connectionOptions.urlContexts.first?.url
    app.reactNativeFactory?.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: url.map { [UIApplication.LaunchOptionsKey.url: $0] })

    if let url {
      _ = app.application(UIApplication.shared, open: url, options: [:])
    }
    if let activity = connectionOptions.userActivities.first {
      _ = app.application(UIApplication.shared, continue: activity, restorationHandler: { _ in })
    }
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    for context in URLContexts {
      _ = app?.application(UIApplication.shared, open: context.url, options: [:])
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    _ = app?.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
  }

  func sceneDidBecomeActive(_ scene: UIScene) { app?.applicationDidBecomeActive(UIApplication.shared) }
  func sceneWillResignActive(_ scene: UIScene) { app?.applicationWillResignActive(UIApplication.shared) }
  func sceneWillEnterForeground(_ scene: UIScene) { app?.applicationWillEnterForeground(UIApplication.shared) }
  func sceneDidEnterBackground(_ scene: UIScene) { app?.applicationDidEnterBackground(UIApplication.shared) }
}
`;

module.exports = function withSceneDelegate(config) {
  config = withAppDelegate(config, (mod) => {
    let src = mod.modResults.contents;
    if (src.includes('class SceneDelegate')) return mod;
    if (mod.modResults.language !== 'swift' || !WINDOW_SETUP.test(src)) {
      throw new Error('withSceneDelegate: AppDelegate.swift template changed; update the plugin.');
    }
    src = src.replace(WINDOW_SETUP, '\n    // The window is created in SceneDelegate (UIScene lifecycle).\n');
    mod.modResults.contents = src + SCENE_DELEGATE;
    return mod;
  });

  return withInfoPlist(config, (mod) => {
    mod.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    };
    return mod;
  });
};
