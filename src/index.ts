import Indeed from './lib/puppeteer/indeed';
import { delay } from './lib/puppeteer/common';

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

  await indeed.navigateHome();
  setTimeout(async () => {
    await indeed.search({
      keyword: 'React developer',
      location: 'Deutschland',
    });
    const count = await indeed.getJobCount();
    console.log('count', count);

    for await (const jobInfo of indeed.generatorAllJobs()) {
      if (!jobInfo) {
        console.log('failed to fetch job info');
        continue;
      }
      jobInfo.jobDescription = '';
      console.log(jobInfo);
      await delay(Math.random() * 1500 + 500);
    }

    console.log('Done!');
  }, 3000);

  setInterval(() => {
    indeed.closeModalIfThereIs();
  }, 1000);
})();
