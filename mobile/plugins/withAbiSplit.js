/**
 * Expo config plugin: emit an APK that contains native libs for only
 * arm64-v8a (and optionally armeabi-v7a). Drops x86 / x86_64 entirely,
 * which cuts ~35–45 MB off the universal APK size.
 *
 * Usage in app.json:
 *   "plugins": [
 *     ["./plugins/withAbiSplit", { "abis": ["arm64-v8a"] }]
 *   ]
 */
const { withAppBuildGradle } = require('@expo/config-plugins');

function injectAbiSplit(buildGradle, abis) {
  if (buildGradle.includes('// >>> abi-split-injected')) return buildGradle;

  const includeList = abis.map((a) => `'${a}'`).join(', ');
  const splitsBlock = `
    // >>> abi-split-injected
    splits {
        abi {
            reset()
            enable true
            universalApk false
            include ${includeList}
        }
    }
    // <<< abi-split-injected
`;

  // Insert just after the opening of the `android {` block.
  return buildGradle.replace(/android\s*\{/, (match) => `${match}\n${splitsBlock}`);
}

module.exports = function withAbiSplit(config, props = {}) {
  const abis = Array.isArray(props.abis) && props.abis.length ? props.abis : ['arm64-v8a'];
  return withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = injectAbiSplit(cfg.modResults.contents, abis);
    return cfg;
  });
};
