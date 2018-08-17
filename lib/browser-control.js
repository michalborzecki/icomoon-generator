const puppeteer = require('puppeteer');
const utils = require('./utils');

const preferencesHeaders = {
  cssSelector: 'CSS Selector',
  fontMetrics: 'Font Metrics',
  metadata: 'Metadata',
  version: 'Version'
};

const preferencesInputs = {
  general: {
    fontName: {
      label: 'Font Name',
      filler: fillInTextInput,
    },
    classPrefix: {
      label: 'Class Prefix',
      filler: fillInTextInput,
    },
    classPostfix: {
      label: 'Class Postfix',
      filler: fillInTextInput,
    },
    supportIE8: {
      label: 'Support IE 8',
      filler: fillInCheckbox,
    },
    supportIE7IE6: {
      label: 'Support IE 7 & IE 6',
      filler: fillInCheckbox,
    },
    includeMetadataInFonts: {
      label: 'Include metadata in fonts',
      filler: fillInCheckbox,
    },
    generateVariablesFor: {
      label: 'variables',
      filler: fillInVariables,
    }
  },
  cssSelector: {
    use: {
      label: {
        i: 'Use i (for selecting <i>)',
        attribute: 'Use attribute selectors',
        class: 'Use a class',
      },
      filler: fillInRadio,
    },
    class: {
      label: 'fontPref.classSelector',
      filler: fillInTextInputByModel,
    }
  },
  fontMetrics: {
    emSquareHeight: {
      label: 'Em Square Height (power of 2)',
      filler: fillInNumber,
    },
    baselineHeight: {
      label: 'Baseline Height (% Em)',
      filler: fillInNumber,
    },
    whitespaceWidth: {
      label: 'Whitespace Width (% Em)',
      filler: fillInNumber,
    }
  },
  metadata: {
    url: {
      label: 'URL',
      filler: fillInTextInput,
    },
    description: {
      label: 'Description',
      filler: fillInTextInput,
    },
    copyright: {
      label: 'Copyright',
      filler: fillInTextInput,
    },
    designer: {
      label: 'Designer',
      filler: fillInTextInput,
    },
    designersUrl: {
      label: 'Designer\'s URL',
      filler: fillInTextInput,
    },
    license: {
      label: 'License',
      filler: fillInTextInput,
    },
    licenseUrl: {
      label: 'License URL',
      filler: fillInTextInput,
    },
  },
  version: {
    major: {
      label: 'Major',
      filler: fillInNumber,
    },
    minor: {
      label: 'Minor',
      filler: fillInNumber,
    }
  }
}

const availablePreprocessors = {
  sass: 'Sass',
  stylus: 'Stylus',
  less: 'Less'
};

exports.startBrowser = async function () {
  return await puppeteer.launch({ args: ['--no-sandbox'], headless: true });
};

exports.loadPage = async function (browser) {
  const page = await browser.newPage();
  await page.goto('https://icomoon.io/app');
  await waitForIconBox(page);
  await page.evaluate(() => {
    window.xpath = (path) => document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
  })
  return page;
};

exports.removeDemoSet = async function (page) {
  await clickByXpath(page, '//button[text()="Remove Set"]');
  await waitForIconBox(page, true);
};

exports.uploadSvg = async function (page, files) {
  await (await page.waitForSelector('.file.unit input[type="file"]')).uploadFile(...files);
  await waitForIconBox(page);
};

exports.selectAllIcons = async function (page) {
  await clickByXpath(page, '//button[text()="Select All"]');
};

exports.goToFontTab = async function (page) {
  await clickByXpath(page, '//a[text()="Font"]');
  await page.waitForSelector('.glyphNameWrapper');
};

exports.openPreferences = async function (page) {
  await clickBySelector(page, '#pref');
  await page.waitForSelector('.overlayWindow');
};

exports.closePreferences = async function (page) {
  await clickBySelector(page, '.overlayWindow button.top-right');
};

exports.fillPreferences = async function (page, preferences) {
  await expandNeededPreferencesSections(page, preferences);
  for (let section in preferences) {
    for (let preference in preferences[section]) {
      const value = preferences[section][preference];
      if (value !== undefined) {
        const inputDefinition = (preferencesInputs[section] || {})[preference]
        if (inputDefinition) {
          await inputDefinition.filler(page, inputDefinition.label, value);
        }
      }
    }
  }
};

exports.downloadIcons = async function (page, downloadPath) {
  const downloadButton = await page.waitForXPath('//span[text()="Download"]/parent::button');
  await page._client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath,
  });
  await downloadButton.click();
};

async function clickByXpath(page, path) {
  await page.evaluate((path) => window.xpath(path).click(), path);
}

async function clickBySelector(page, selector) {
  await page.evaluate((selector) => document.querySelector(selector).click(), selector);
}

async function waitForIconBox(page, hidden) {
  await page.waitForSelector('mi-icon', { hidden });
}

async function fillInTextInput(page, labelText, value) {
  const input = await page.waitForXPath(`//span[normalize-space()="${labelText}"]/following-sibling::input`);
  await clearInput(input);
  await input.type(String(value));
}

async function fillInTextInputByModel(page, modelName, value) {
  const input = await page.waitForXPath(`//input[@ng-model="${modelName}"]`);
  await clearInput(input);
  await input.type(String(value));
}

async function fillInCheckbox(page, labelText, value) {
  const inputLabel = await page.waitForXPath(`//label[normalize-space()="${labelText}"]`);
  const checkedIndicator = await inputLabel.$('.icon-checked');
  if (!!checkedIndicator !== !!value) {
    const input = await inputLabel.$('input');
    await input.click();
  }
}

async function fillInRadio(page, labelText, value) {
  const inputLabel = await page.waitForXPath(`//label[normalize-space()="${labelText[value]}"]`);
  const input = await inputLabel.$('input');
  await input.click();
}

async function fillInVariables(page, labelText, value) {
  const inputLabel = await page.waitForXPath(`//span[contains(normalize-space(), "${labelText}")]/parent::label`);
  const checkedIndicator = await inputLabel.$('.icon-checked');
  if (!!checkedIndicator !== !!value) {
    const input = await inputLabel.$('input');
    await input.click();
  }
  if (value) {
    await fillInRadio(page, availablePreprocessors, value);
  }
}

async function fillInNumber(page, labelText, value) {
  const input = await page.waitForXPath(`//span[normalize-space()="${labelText}"]/following-sibling::mi-number/input`);
  await clearInput(input);
  await input.type(String(value));
}

async function clearInput(elementHandle) {
  await elementHandle.click();
  await elementHandle.focus();
  // click three times to select all
  await elementHandle.click({ clickCount: 3 });
  await elementHandle.press('Backspace');
}

async function expandPreferencesSection(page, sectionHeader) {
  const expandHeader = await page.$x(`//h1[normalize-space()="${sectionHeader}"]//i[contains(@class, "icon-right")]/parent::label`);
  if (expandHeader.length) {
    await expandHeader[0].click();
  }
}

async function expandNeededPreferencesSections(page, preferences) {
  for (section in preferences) {
    const headerText = preferencesHeaders[section];
    if (headerText) {
      await expandPreferencesSection(page, headerText);
    }
  }
}
