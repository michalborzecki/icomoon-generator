const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs-extra');
const tmp = require('tmp');
const unzip = require('unzip');
const chokidar = require('chokidar');
const utils = require('./utils');
const browserControl = require('./browser-control');

module.exports = async function (inputPath, outputPath, config) {
  utils.log('Getting list of SVG files...');
  const files = await utils.getSvgPaths(inputPath);
  if (!files.length) {
    utils.log('No icons found.');
    return;
  } else {
    utils.log('Found ' + files.length + ' icons.');
  }
  
  utils.log('Starting browser...');
  const browser = await browserControl.startBrowser();

  let downloadFolder;

  try {
    utils.log('Waiting for Icomoon App to load...');
    const page = await browserControl.loadPage(browser);

    utils.log('Removing demo icons set...');
    await browserControl.removeDemoSet(page);

    utils.log('Uploading SVG files...');
    await browserControl.uploadSvg(page, files);

    utils.log('Selecting all icons in set...');
    await browserControl.selectAllIcons(page);

    utils.log('Going to "Generate Font" tab...');
    await browserControl.goToFontTab(page);

    utils.log('Setting up font...');
    await browserControl.openPreferences(page);
    await browserControl.fillPreferences(page, config.preferences);
    await browserControl.closePreferences(page);

    utils.log('Creating temporary download directory...')
    downloadFolder = tmp.dirSync();

    utils.log('Downloading zip to directory', downloadFolder.name);
    await browserControl.downloadIcons(page, downloadFolder.name);

    await new Promise((resolve, reject) => {
      const downloadTimeoutId = setTimeout(() => reject('Download timeout'), 30000);
      chokidar.watch(downloadFolder.name, { awaitWriteFinish: true }).on('add', function (filePath) {
        if (filePath.endsWith('.zip')) {
          clearTimeout(downloadTimeoutId);
          utils.log('Closing browser...');
          browser.close();
          this.close();
          utils.log('Extracting fonts to', outputPath);
          fs.ensureDirSync(outputPath);
          fs.createReadStream(filePath).pipe(unzip.Extract({ path: outputPath })).on('close', function () {
            utils.log('Fonts extracted successfully!');
            utils.log('Removing downloaded zip...');
            fs.unlinkSync(filePath);
            downloadFolder.removeCallback();
            utils.log('Done!');
            resolve();
          });
        }
      });
    });
  } catch (error) {
    if (downloadFolder) {
      fs.removeSync(downloadFolder.name);
    }
    browser.close();
    throw error;
  }
};
