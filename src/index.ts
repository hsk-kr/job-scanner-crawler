import Indeed from './lib/puppeteer/indeed';
import { delay } from './lib/puppeteer/common';
import {
  isInternshipPosition,
  isJuniorReactPosition,
  recordJobInfosAsFile,
} from './lib/filter';
import {
  DistanceSearchOption,
  JobInfo,
  JobType,
  isDistanceSearchOptionType,
} from './types/indeed';

const showCommandGuideAndExit = () => {
  console.log(
    'Usage: node index KEYWORD LOCATION ("intern" | "junior-react") [distance 10 | 25 | 35 | 50 | 75 | 100]'
  );
  console.log('Example: node index react.js "Frankfurt am Main" intern 50');
  process.exit();
};

const args = process.argv.slice(2); // Except node and entry paths
let distanceSearchOption: DistanceSearchOption | undefined = undefined;
let jobType: JobType;

// validate the number of minimum arguments
if (args.length < 3) {
  showCommandGuideAndExit();
}

// validate job type
switch (args[2]) {
  case JobType.INTERN:
    break;
  case JobType.JUNIOR_REACT:
    jobType = args[2].toUpperCase() as JobType;
    break;
  default:
    showCommandGuideAndExit();
}

// validate job distance if there is
if (isDistanceSearchOptionType(args[4])) {
  distanceSearchOption = args[4];
} else if (args[4] !== undefined) {
  // if the argument exists and is not a valid type
  showCommandGuideAndExit();
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
  // If the tab isn't active, it doesn't manipulate doms in the joblist page(main page).
  await mainPage.bringToFront();

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
    distance: distanceSearchOption,
  });

  const jsonFileName = `./react-jobs${new Date().getTime()}.json`;

  for await (const jobInfo of indeed.generatorAllJobs()) {
    if (!jobInfo || !jobInfo.jobTitle || !jobInfo.jobDescription) {
      console.log('failed to fetch job info');
      continue;
    }

    console.log(`searching ${jobInfo.idx}th job...`);

    let isMatch = false;

    switch (jobType) {
      case JobType.INTERN:
        isMatch = isInternshipPosition(jobInfo);
        break;
      case JobType.JUNIOR_REACT:
        isMatch = isJuniorReactPosition(jobInfo);
        break;
    }

    if (isMatch) {
      reactJobs.push({ ...jobInfo, jobDescription: '' });
      console.log(`${jobType} position found!`);
      await recordJobInfosAsFile(jsonFileName, reactJobs);
    }

    await delay(Math.random() * 2500 + 1000);
  }

  console.log('Done!');
  process.exit();
})();
