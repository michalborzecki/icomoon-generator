const fs = require('fs-extra');
const path = require('path');

exports.log = function () {
  console.debug('icomoon-generator:', ...arguments);
}

exports.getSvgPaths = async function (inputPath) {
  const files = await fs.readdir(inputPath);
  return files
    .filter(file => file.endsWith('.svg'))
    .map(file => path.join(inputPath, file));
};

exports.parseArgs = function (args) {
  const cwd = process.cwd();

  const relativeInputPath =  args[0] || '.';
  const absoluteInputPath = path.resolve(cwd, relativeInputPath);

  const relativeOutputPath = args[1] || '.';
  const absoluteOutputPath = path.resolve(cwd, relativeOutputPath);

  const relativeConfigPath = args[2];
  const absoluteConfigPath = relativeConfigPath ? path.resolve(cwd, relativeConfigPath) : undefined;

  return {
    inputPath: absoluteInputPath,
    outputPath: absoluteOutputPath,
    configPath: absoluteConfigPath,
  };
};

exports.readConfig = async function (configPath) {
  const config = await fs.readJson(configPath);
  const prefs = config.preferences || {};
  if ((prefs.general || {}).supportIE8 === false && (prefs.general || {}).supportIE7IE6 !== undefined) {
    delete prefs.general.supportIE7IE6;
  }
  if ((prefs.cssSelector || {}).use !== "class" && (prefs.cssSelector || {}).class !== undefined) {
    delete prefs.cssSelector.class;
  }
  return config;
};
