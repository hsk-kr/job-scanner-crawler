import path from 'path';
import { ElementHandle, Page } from 'puppeteer';
import { removeTags, repeatActionUntilBeingNavigated } from './common';
import {
  DistanceSearchOption,
  JobInfo,
  ViewJobResponse,
} from '../../types/indeed';

const INDEED_HOME_URL = 'https://de.indeed.com/';

const SECURITY_CHECK_STRING = 'Checking if the site connection is secure';

class Indeed {
  private page: Page;
  private apiPage: Page; // requests api
  private homeURL: string;
  private jobsURL: string;
  private viewJobsAPIURL: string;
  private screenshopDirPath: string;
  private securityCheckString: string;
  private tmSecurityCheck?: NodeJS.Timeout;

  /**
   * Constructor
   * @param page Pupeteer, page object
   * @param options Options, urls the class use can changed with this option.
   */
  constructor(
    pages: {
      main: Page;
      api: Page;
    },
    options?: {
      homeURL?: string;
      jobsURL?: string;
      securityCheckString?: string;
      screenshopDirPath?: string;
    }
  ) {
    this.page = pages.main;
    this.apiPage = pages.api;
    this.homeURL = options?.homeURL ?? INDEED_HOME_URL;
    this.jobsURL = `${this.homeURL}jobs`;
    this.viewJobsAPIURL = `${this.homeURL}viewjob`;
    this.securityCheckString =
      options?.securityCheckString ?? SECURITY_CHECK_STRING;
    this.screenshopDirPath = this.screenshopDirPath ?? './';
  }

  /**
   * Navigate to the Indeed home page
   */
  async navigateHome() {
    return new Promise<void>((resolve, reject) => {
      this.page
        .waitForNavigation()
        .then(() => {
          resolve();
        })
        .catch((e) => {
          console.error(this.navigateHome.name, e);
          reject(e);
        });
      this.page.goto(this.homeURL);
    });
  }

  /**
   * Returns query string of the current page
   * @returns query string of the current page
   */
  getCurrentSearchParams() {
    try {
      const url = this.page.url();
      return new URLSearchParams(url.substring(url.lastIndexOf('?') + 1));
    } catch (e) {
      console.error(this.getCurrentSearchParams.name, e);
      throw new Error(e);
    }
  }

  /**
   * Returns the current url
   * @returns the current url
   */
  getCurrentUrl() {
    try {
      return this.page.url();
    } catch (e) {
      console.error(this.getCurrentUrl.name, e);
      throw new Error(e);
    }
  }

  /**
   * Find job title html elements which are a span element and returns them.
   * @returns Span elements
   */
  async getJobTitles() {
    try {
      await this.page.waitForSelector('span[id^=jobTitle-]');
      return await this.page.$$('span[id^=jobTitle-]');
    } catch (e) {
      console.error(this.getJobTitles.name, e);
      throw new Error(e);
    }
  }

  /**
   * opens a api link and retrieve necessary data and returns them
   * @param jobId JobId
   * @returns returns job informatino
   */
  async getJobInfo(jobId: string) {
    return new Promise<JobInfo | null>(async (resolve) => {
      try {
        const queryString = new URLSearchParams({
          jk: jobId,
          from: 'hp',
          viewType: 'embedded',
          spa: '1',
          hidecmpheader: '0',
          hostrendertype: 'federated',
          hostId: 'homepage',
        }).toString();
        const url = `${this.viewJobsAPIURL}?${queryString}`;

        await this.apiPage.goto(url);

        const pre = await this.apiPage.waitForSelector('pre');
        const strData = await pre.evaluate((el) => el.textContent);
        const jsonData = JSON.parse(strData) as ViewJobResponse;
        if (jsonData.status !== 'success') {
          resolve(null);
          return;
        }

        const generateUrl = (jobId: string) => {
          const currentUrl = this.page.url();
          const queryString = new URLSearchParams(
            currentUrl.substring(currentUrl.indexOf('?') + 1)
          );
          queryString.set('vjk', jobId);
          return `${this.jobsURL}?${queryString.toString()}`;
        };

        const jobInfo = {
          jobTitle:
            jsonData.body.jobInfoWrapperModel.jobInfoModel.jobInfoHeaderModel
              .jobTitle,
          companyName:
            jsonData.body.jobInfoWrapperModel.jobInfoModel.jobInfoHeaderModel
              .companyName,
          jobDescription:
            jsonData.body.jobInfoWrapperModel.jobInfoModel
              .sanitizedJobDescription,
          url: generateUrl(jobId),
        };

        resolve(jobInfo);
      } catch (e) {
        console.error(`${this.getJobInfo.name}`, e);
        resolve(null);
      }
    });
  }

  /**
   * Retreive a number of jobs by the search options, if you don't input location or it fails to find the number, it returns 0
   * @returns Job count
   */
  async getJobCount() {
    try {
      const span = await this.page.waitForSelector(
        '.jobsearch-JobCountAndSortPane-jobCount > span'
      );
      const text = await span?.evaluate((el) => el.innerText);
      const splitText = text.trim().split(/\s/g);

      for (let i = 0; i < splitText.length; i++) {
        const count = Number(splitText[i].replace(/,/g, ''));

        if (!Number.isNaN(count)) {
          return count;
        }
      }

      return 0;
    } catch (e) {
      console.error(this.getJobCount.name, e);
      throw new Error(e);
    }
  }

  /**
   * If there is the modal that asks to subscribe, it clicks the close button of the modal.
   */
  async closeModalIfThereIs() {
    try {
      const closeModalBtn = await this.page.waitForSelector(
        '[aria-label="schließen"]',
        {
          timeout: 100,
        }
      );
      closeModalBtn.click();
    } catch (e) {
      // console.error(e);
    }
  }

  /**
   * Calls the callback function when the security check page shows up.
   */
  async addSecurityCheckHandler(
    cb: VoidFunction,
    options: {
      interval?: number;
    } = {
      interval: 5000,
    }
  ) {
    let isSecurityCheckSite = false;

    if (this.tmSecurityCheck !== undefined) {
      clearInterval(this.tmSecurityCheck);
    }

    let previousUrl = this.page.url();
    let previousApiUrl = this.apiPage.url();
    this.tmSecurityCheck = setInterval(async () => {
      const pageUrl = this.page.url();
      const apiPageUrl = this.apiPage.url();

      if (previousUrl !== pageUrl || previousApiUrl !== apiPageUrl) {
        // When the page stays on the same page before.
        const source = await this.page.content();
        const apiSource = await this.apiPage.content();

        const idx =
          source.indexOf(this.securityCheckString) +
          apiSource.indexOf(this.securityCheckString);
        if (idx >= 0) {
          if (!isSecurityCheckSite) cb();

          isSecurityCheckSite = true;
        } else {
          isSecurityCheckSite = false;
        }
      }

      previousUrl = pageUrl;
      previousApiUrl = apiPageUrl;
    }, options.interval);
  }

  /**
   * clear the security check interval logic
   */
  async removeSecurityCheckHandler() {
    clearInterval(this.tmSecurityCheck);
  }

  /**
   * Returns generator that interates through jobs on the current page
   */
  async *generatorJobList() {
    const jobTitles = await this.getJobTitles();

    // As the first job card is selected by default, skip the first item.
    for (let i = 1; i < jobTitles.length; i++) {
      const jobId = await getJobIdFromJobTitle(jobTitles[i]);
      try {
        yield await this.getJobInfo(jobId);
      } catch (e) {
        console.log(`Failed to fetch ${jobId}`);
      }
    }
  }

  /**
   * Returns generator that interates through all jobs
   */
  async *generatorAllJobs() {
    let pageNumber = 1;
    let idx = 0;
    let hasNextPage = true;

    while (hasNextPage) {
      for await (const jobInfo of this.generatorJobList()) {
        yield {
          ...jobInfo,
          idx: idx++,
          pageNumber,
        };
      }

      pageNumber++;
      hasNextPage = await this.navigatePage(pageNumber);
    }
  }

  /**
   * Navigate to the next page
   * @param page the page number has to be shown up on the page
   * @returns if the current page is the last page, it returns true, otherwise it returns false.
   */
  async navigatePage(page: number) {
    try {
      await repeatActionUntilBeingNavigated(this.page, async () => {
        try {
          const pageButton = await this.page.waitForSelector(
            `nav[aria-label=pagination] a[aria-label="${page}"]`
          );
          await pageButton.click();
        } catch (e) {
          console.error(
            `${this.navigatePage.name} [repeatActionUntilBeingNavigated]`,
            e
          );
        }
      });

      return true;
    } catch (e) {
      // when it is not a current page, do nothing
      console.error(this.navigatePage.name, e);
      try {
        await this.page.goto(this.page.url());
      } catch (e) {
        console.error(`${this.navigatePage.name}`, e, `this.page.goto error`);
      }
      return this.navigatePage(page);
    }
  }

  /**
   * You can get the span elements from the getJobTitles function
   * @param element A span tag that has a job title
   * @returns A html element that wraps one job information
   */
  getJobCardFromJobTitle = async (
    element: ElementHandle<HTMLSpanElement>
  ): Promise<ElementHandle<Element>> => {
    try {
      const jobCardClassName: string = await element.evaluate((el) => {
        const findCardElement = (element: HTMLElement) => {
          if (element.classList.contains('cardOutline')) return element;
          return findCardElement(element.parentNode as HTMLElement);
        };

        const jobCard = findCardElement(el);

        return jobCard.className;
      });

      return await this.page.$(`.${jobCardClassName.replace(/\s/g, '.')}`);
    } catch (e) {
      console.error(this.getJobCardFromJobTitle.name, e);
      throw new Error(e);
    }
  };

  /**
   * Navigate to the indeed job searching page
   * @param param keyword - job title, location - location, distance - km
   */
  async search({
    keyword,
    location,
    distance,
  }: {
    keyword: string;
    location: string;
    distance?: DistanceSearchOption;
  }) {
    return new Promise<void>((resolve, reject) => {
      this.page
        .waitForNavigation()
        .then(() => resolve())
        .catch((e) => {
          console.error(this.search.name, e);
          reject(e);
        });

      const searchUrl = encodeURI(
        `${this.jobsURL}?${new URLSearchParams({
          q: keyword,
          l: location,
          ...(distance && { radius: distance }),
        }).toString()}`
      );
      this.page.goto(searchUrl);
    });
  }

  async capture() {
    await this.page.screenshot({
      path: path.join(this.screenshopDirPath, 'tmp.jpg'),
    });
  }
}

/**
 * It finds an job id from the id attribute and returns it
 * @param element A span tag that has a job title
 * @returns Job id
 */
const getJobIdFromJobTitle = async (
  element: ElementHandle<HTMLSpanElement>
) => {
  try {
    return await element.evaluate((el) => el.id.substring(`jobTitle-`.length));
  } catch (e) {
    console.error(getJobIdFromJobTitle.name, e);
    throw new Error(e);
  }
};

export { getJobIdFromJobTitle };

export default Indeed;
