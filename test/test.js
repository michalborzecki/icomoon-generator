const evilIcons = require('./helpers/evil-icons');
const tmp = require('tmp');
const generate = require('../index');
const assert = require('assert');
const fs = require('fs-extra');
const path = require('path');
const xml2js = require('xml2js');
const puppeteer = require('puppeteer');
const browserControl = require('../lib/browser-control');
const testRender = require('./helpers/test-render');

let outputFolder;
const initialConfig = {
  headless: true,
  silent: true,
}
const simpleTestTimeout = 30000;
const renderTestTimeout = simpleTestTimeout + 5000;
const doubleGenerateTestTimeout = simpleTestTimeout * 2;

beforeEach(function () {
  outputFolder = tmp.dirSync({ unsafeCleanup: true });
});

afterEach(function () {
  outputFolder.removeCallback();
});

describe('icomoon-generator', function () {
  it('generates Sass variables', async function () {
    this.timeout(simpleTestTimeout);
    const config = Object.assign({}, initialConfig, {
      preferences: {
        general: {
          generateVariablesFor: 'sass',
        },
      },
    });
    await generate(evilIcons.path, outputFolder.name, config);
    assert(fs.existsSync(path.join(outputFolder.name, 'style.scss')), 'style.scss does not exist');
  });

  it('generates Stylus variables', async function () {
    this.timeout(simpleTestTimeout);
    const config = Object.assign({}, initialConfig, {
      preferences: {
        general: {
          generateVariablesFor: 'stylus',
        },
      },
    });
    await generate(evilIcons.path, outputFolder.name, config);
    assert(fs.existsSync(path.join(outputFolder.name, 'style.styl')), 'style.styl does not exist');
  });

  it('generates Less variables', async function () {
    this.timeout(simpleTestTimeout);
    const config = Object.assign({}, initialConfig, {
      preferences: {
        general: {
          generateVariablesFor: 'less',
        },
      },
    });
    await generate(evilIcons.path, outputFolder.name, config);
    assert(fs.existsSync(path.join(outputFolder.name, 'style.less')), 'style.less does not exist');
  });

  it('adds metadata', async function () {
    this.timeout(simpleTestTimeout);
    const config = Object.assign({}, initialConfig, {
      preferences: {
        general: {
          includeMetadataInFonts: true,
        },
        metadata: {
          url: 'https://localhost.com',
          description: 'My fav icons',
          copyright: 'My company 2018',
          designer: 'Uncle Ben',
          designersUrl: 'https://top-secret-page.com',
          license: 'MIT',
          licenseUrl: 'https://opensource.org/licenses/MIT',
        },
      },
    });
    await generate(evilIcons.path, outputFolder.name, config);
    const parser = new xml2js.Parser();
    const data = await fs.readFile(path.join(outputFolder.name, 'fonts', 'icomoon.svg'));
    await new Promise((resolve, reject) => {
      parser.parseString(data, function (err, result) {
        if (err) {
          reject(err);
        } else {
          const sourceMetadata = config.preferences.metadata;
          const resultMetadata = JSON.parse(result.svg.metadata[0].json);
          assert(resultMetadata.fontURL === sourceMetadata.url, 'url is incorrect');
          assert(resultMetadata.description.indexOf(sourceMetadata.description) !== -1, 'description is incorrect');
          assert(resultMetadata.copyright === sourceMetadata.copyright, 'copyright is incorrect');
          assert(resultMetadata.designer === sourceMetadata.designer, 'designer is incorrect');
          assert(resultMetadata.designerURL === sourceMetadata.designersUrl, 'designer url is incorrect');
          assert(resultMetadata.license === sourceMetadata.license, 'license is incorrect');
          assert(resultMetadata.licenseURL === sourceMetadata.licenseUrl, 'license url is incorrect');
          resolve();
        }
      });
    });
  });

  it('adds version info', async function () {
    this.timeout(simpleTestTimeout);
    const config = Object.assign({}, initialConfig, {
      preferences: {
        general: {
          includeMetadataInFonts: true,
        },
        version: {
          major: '10',
          minor: '3',
        },
      },
    });
    await generate(evilIcons.path, outputFolder.name, config);
    const parser = new xml2js.Parser();
    const data = await fs.readFile(path.join(outputFolder.name, 'fonts', 'icomoon.svg'));
    await new Promise((resolve, reject) => {
      parser.parseString(data, function (err, result) {
        if (err) {
          reject(err);
        } else {
          const sourceVersion = config.preferences.version;
          const resultVersion = JSON.parse(result.svg.metadata[0].json).version;
          assert(resultVersion.indexOf(`${sourceVersion.major}.${sourceVersion.minor}`), 'version is incorrect');
          resolve();
        }
      });
    });
  });

  it('sets em square height', async function () {
    this.timeout(doubleGenerateTestTimeout);
    const defaultPath = path.join(outputFolder.name, 'default');
    const changedEmPath = path.join(outputFolder.name, 'changedEm');
    await generate(evilIcons.path, defaultPath, initialConfig);
    const config = Object.assign({}, initialConfig, {
      preferences: {
        fontMetrics: {
          emSquareHeight: '8192',
        },
      },
    });
    await generate(evilIcons.path, changedEmPath, config);

    const fileToCompare = path.join('fonts', 'icomoon.ttf');
    const defaultStat = await fs.stat(path.join(defaultPath, fileToCompare));
    const changedEmStat = await fs.stat(path.join(changedEmPath, fileToCompare));
    assert(changedEmStat.size > defaultStat.size * 1.4, 'the font file with miaximum em square is not bigger than the font file with default em square');
  });

  it('sets baseline height', async function () {
    this.timeout(renderTestTimeout);
    const testHtmlPath = await testRender.copyTestHtml(outputFolder.name);
    const testFontPath = await testRender.copyTestFont(outputFolder.name, 'baseline-height-20');
    const screenshot1Path = path.join(outputFolder.name, 'screenshot1.png');
    const screenshot2Path = path.join(outputFolder.name, 'screenshot2.png');
    await testRender.renderTest(testHtmlPath, screenshot1Path);
    await fs.emptyDir(testFontPath);

    const config = Object.assign({}, initialConfig, {
      preferences: {
        fontMetrics: {
          baselineHeight: '20',
        },
      },
    });
    await generate(evilIcons.path, testFontPath, config);
    await testRender.renderTest(testHtmlPath, screenshot2Path);
    const comparisonResult = await testRender.compareScreenshots(screenshot1Path, screenshot2Path);
    assert(comparisonResult, 'screenshots of the test render are not the same');
  });

  it('sets whitespace width', async function () {
    this.timeout(renderTestTimeout);
    const testHtmlPath = await testRender.copyTestHtml(outputFolder.name);
    const testFontPath = await testRender.copyTestFont(outputFolder.name, 'whitespace-width-200');
    const screenshot1Path = path.join(outputFolder.name, 'screenshot1.png');
    const screenshot2Path = path.join(outputFolder.name, 'screenshot2.png');
    await testRender.renderTest(testHtmlPath, screenshot1Path);
    await fs.emptyDir(testFontPath);

    const config = Object.assign({}, initialConfig, {
      preferences: {
        fontMetrics: {
          whitespaceWidth: '200',
        },
      },
    });
    await generate(evilIcons.path, testFontPath, config);
    await testRender.renderTest(testHtmlPath, screenshot2Path);
    const comparisonResult = await testRender.compareScreenshots(screenshot1Path, screenshot2Path);
    assert(comparisonResult, 'screenshots of the test render are not the same');
  });
});
