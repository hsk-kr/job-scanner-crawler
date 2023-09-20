import { Page } from 'puppeteer';

const delay = (ms: number) => {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
};

const repeatActionUntilBeingNavigated = (
  page: Page,
  cb: VoidFunction | (() => Promise<any>),
  options: {
    try?: number;
    interval?: number;
  } = {
    try: 10,
    interval: 1000,
  }
) => {
  return new Promise<void>((resolve) => {
    let count = options.try;
    let tmId: NodeJS.Timeout | undefined = undefined;

    page.waitForNavigation().then(() => {
      clearInterval(tmId);
      resolve();
    });

    // execute the first call right away
    if (count > 0) {
      count--;
      cb();
    }

    tmId = setInterval(async () => {
      if (count === 0) {
        clearInterval(tmId);
        throw new Error('The page has not been navigated.');
      }

      cb();
      count--;
    }, options.interval);
  });
};

export { delay, repeatActionUntilBeingNavigated };
