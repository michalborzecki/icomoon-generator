const path = require('path');
const fs = require('fs-extra');
const puppeteer = require('puppeteer');

exports.copyTestHtml = async function (targetDir) {
  const renderHtmlPath = path.join(targetDir, 'render-test.html');
  await fs.copy(path.join(__dirname, 'comparison-files', 'render-test.html'), renderHtmlPath);
  return renderHtmlPath;
};

exports.copyTestFont = async function (targetDir, fontProfile) {
  const fontOutputDir = path.join(targetDir, 'font');
  await fs.emptyDir(fontOutputDir);
  await fs.copy(path.join(__dirname, 'comparison-files', fontProfile), fontOutputDir);
  return fontOutputDir;
};

exports.renderTest = async function (testHtmlPath, screenshotPath) {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'], headless: true });
  const page = await browser.newPage();
  await page.goto('file://' + testHtmlPath);
  await page.screenshot({ path: screenshotPath });
  await browser.close();
};

exports.compareScreenshots = async function (file1Path, file2Path) {
  const file1Buffer = await fs.readFile(file1Path);
  const file2Buffer = await fs.readFile(file2Path);
  return file1Buffer.equals(file2Buffer);
};
