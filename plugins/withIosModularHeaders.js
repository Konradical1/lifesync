const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('@expo/config-plugins');

const MODULAR_HEADERS = 'use_modular_headers!';
const QUEUE_DEBUGGING_DISABLED = 'queueDebuggingEnabled = "No"';

module.exports = function withIosModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (modConfig) => {
      await addModularHeaders(modConfig);
      await disableQueueDebugging(modConfig);

      return modConfig;
    },
  ]);
};

async function addModularHeaders(modConfig) {
  const podfilePath = path.join(
    modConfig.modRequest.platformProjectRoot,
    'Podfile'
  );
  let podfile = await fs.promises.readFile(podfilePath, 'utf8');

  if (podfile.includes(MODULAR_HEADERS)) {
    return;
  }

  const platformLine = /^platform :ios,.*$/m;
  if (!platformLine.test(podfile)) {
    throw new Error('Could not find iOS platform line in Podfile');
  }

  podfile = podfile.replace(
    platformLine,
    (match) => `${match}\n\n${MODULAR_HEADERS}`
  );
  await fs.promises.writeFile(podfilePath, podfile);
}

async function disableQueueDebugging(modConfig) {
  const schemePath = path.join(
    modConfig.modRequest.platformProjectRoot,
    `${modConfig.modRequest.projectName}.xcodeproj`,
    'xcshareddata',
    'xcschemes',
    `${modConfig.modRequest.projectName}.xcscheme`
  );
  let scheme = await fs.promises.readFile(schemePath, 'utf8');

  if (scheme.includes(QUEUE_DEBUGGING_DISABLED)) {
    return;
  }

  const launchAction = /<LaunchAction[\s\S]*?>/m;
  if (!launchAction.test(scheme)) {
    throw new Error('Could not find LaunchAction in Xcode scheme');
  }

  scheme = scheme.replace(launchAction, (match) =>
    match.replace(
      /allowLocationSimulation = "YES"/,
      `allowLocationSimulation = "YES"\n      ${QUEUE_DEBUGGING_DISABLED}`
    )
  );
  await fs.promises.writeFile(schemePath, scheme);
}
