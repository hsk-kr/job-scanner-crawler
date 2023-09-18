import puppeteer from 'puppeteer';
import Indeed from './lib/puppeteer/indeed';
import { delay } from './lib/puppeteer/common';

(async () => {
  // Launch the browser and open a new blank page
  const browser = await puppeteer.launch({
    headless: false,
  });
  const page = await browser.newPage();
  page.setViewport({
    width: 1440,
    height: 900,
  });

  const indeed = new Indeed(page);

  await indeed.navigateHome();
  setTimeout(async () => {
    await indeed.search({
      keyword: 'Frontend',
      location: 'Frankfurt Am Main',
      distance: '50',
    });
    const count = await indeed.getJobCount();
    console.log('count', count);

    await indeed.nextPage();

    for await (const { title, description } of indeed.generatorJobInfo()) {
      console.log({ title, description });
      await delay(3000);
    }
  }, 3000);

  setInterval(() => {
    indeed.closeModalIfThereIs();
  }, 1000);
})();
