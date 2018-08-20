const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const tmp = require('tmp');
const unzip = require('unzip');
const chokidar = require('chokidar');
const utils = require('./utils');
const browserControl = require('./browser-control');

module.exports = async function (inputPath, outputPath, config) {
  const log = config.silent ? () => {} : utils.log;

  log('Getting list of SVG files...');
  const files = await utils.getSvgPaths(inputPath);
  if (!files.length) {
    log('No icons found.');
    return;
  } else {
    log('Found ' + files.length + ' icons.');
  }
  
  log('Starting browser...');
  const browser = await browserControl.startBrowser(config.headless !== false);

  let downloadFolder;
  try {
    log('Waiting for Icomoon App to load...');
    const page = await browserControl.loadPage(browser);

    log('Removing demo icons set...');
    await browserControl.removeDemoSet(page);

    log('Uploading SVG files...');
    await browserControl.uploadSvg(page, files);

    log('Selecting all icons in set...');
    await browserControl.selectAllIcons(page);

    log('Going to "Generate Font" tab...');
    await browserControl.goToFontTab(page);

    log('Setting up font...');
    await browserControl.openPreferences(page);
    await browserControl.fillPreferences(page, config.preferences);
    await browserControl.closePreferences(page);

    log('Creating temporary download directory...')
    downloadFolder = tmp.dirSync({ unsafeCleanup: true });

    log('Downloading zip to directory', downloadFolder.name);
    await browserControl.downloadIcons(page, downloadFolder.name);

    await new Promise((resolve, reject) => {
      const downloadTimeoutId = setTimeout(() => reject('Download timeout'), 30000);
      chokidar.watch(downloadFolder.name, { awaitWriteFinish: true }).on('add', function (filePath) {
        if (filePath.endsWith('.zip')) {
          clearTimeout(downloadTimeoutId);
          log('Closing browser...');
          browser.close();
          this.close();
          log('Extracting fonts to', outputPath);
          fs.ensureDirSync(outputPath);
          fs.createReadStream(filePath).pipe(unzip.Extract({ path: outputPath })).on('close', function () {
            log('Fonts extracted successfully!');
            log('Removing temporary download directory...');
            downloadFolder.removeCallback();
            log('Done!');
            resolve();
          });
        }
      });
    });
  } catch (error) {
    if (downloadFolder) {
      downloadFolder.removeCallback();
    }
    browser.close();
    throw error;
  }
};
