import Indeed from './lib/puppeteer/indeed';
import { delay } from './lib/puppeteer/common';
import { isReactEnglishPosition, recordJobInfosAsFile } from './lib/filter';
import { JobInfo } from './types/indeed';

const args = process.argv.slice(2); // Except node and entry paths

if (args.length !== 2) {
  console.log('Usage: node index [KEYWORD] [LOCATION]');
  console.log('Example: node index react.js "Frankfurt am Main"');
  process.exit();
}

// Main logic
(async () => {
  const puppeteer = require('puppeteer-extra');

  // Add stealth plugin and use defaults (all tricks to hide puppeteer usage)
  const StealthPlugin = require('puppeteer-extra-plugin-stealth');
  puppeteer.use(StealthPlugin());

  // Add adblocker plugin to block all ads and trackers (saves bandwidth)
  const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');
  puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

  // Launch the browser and open a new blank page
  const browser = await puppeteer.launch({
    headless: false,
  });
  const mainPage = await browser.newPage();
  const apiPage = await browser.newPage();
  mainPage.setViewport({
    width: 1440,
    height: 900,
  });

  const indeed = new Indeed({
    main: mainPage,
    api: apiPage,
  });
  const reactJobs: JobInfo[] = [];

  setInterval(() => {
    indeed.closeModalIfThereIs();
  }, 1000);

  await indeed.navigateHome();
  await indeed.search({
    keyword: args[0],
    location: args[1],
  });

  const jsonFileName = `./react-jobs${new Date().getTime()}.json`;

  for await (const jobInfo of indeed.generatorAllJobs()) {
    if (!jobInfo || !jobInfo.jobTitle || !jobInfo.jobDescription) {
      console.log('failed to fetch job info');
      continue;
    }

    console.log(`searching ${jobInfo.idx}th job...`);

    if (isReactEnglishPosition(jobInfo)) {
      reactJobs.push({ ...jobInfo, jobDescription: '' });
      console.log('English position found!');
      await recordJobInfosAsFile(jsonFileName, reactJobs);
    }

    await delay(Math.random() * 2500 + 1000);
  }

  console.log('Done!');
})();
