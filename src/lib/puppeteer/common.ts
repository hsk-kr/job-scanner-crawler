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
  options?: {
    try?: number;
    interval?: number;
  }
) => {
  return new Promise<void>((resolve, reject) => {
    let count = options?.try ?? 10;
    const interval = options?.interval ?? 1000;
    let tmId: NodeJS.Timeout | undefined = undefined;

    page
      .waitForNavigation()
      .then(() => {
        clearInterval(tmId);
        resolve();
      })
      .catch((e) => reject(e));

    // execute the first call right away
    if (count > 0) {
      count--;
      setTimeout(cb, 0);
    }

    tmId = setInterval(async () => {
      if (count === 0) {
        clearInterval(tmId);
        reject(new Error('The page has not been navigated.'));
        return;
      }

      count--;
      cb();
    }, interval);
  });
};

const removeTags = (html: string): string => {
  if (!html) return '';

  return html.replace(/(<([^>]+)>)/gi, '');
};

export { delay, repeatActionUntilBeingNavigated, removeTags };
