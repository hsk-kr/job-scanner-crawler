import puppeteer from 'puppeteer';
import Indeed from './lib/puppeteer/indeed';
import { delay } from './lib/puppeteer/common';
import axios from 'axios';

(async () => {
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
      location: 'Frankfurt Am Main',
      distance: '50',
    });
    const count = await indeed.getJobCount();
    console.log('count', count);

    // indeed.addSecurityCheckHandler(async () => {
    //   await indeed.capture();
    //   await page.close();
    //   process.exit();
    // });

    for await (const { title, description, idx } of indeed.generatorAllJobs()) {
      console.log({ title, description: '', idx });
      await delay(Math.random() * 1500 + 500);
    }

    console.log('Done!');
  }, 3000);

  setInterval(() => {
    indeed.closeModalIfThereIs();
  }, 1000);
})();
