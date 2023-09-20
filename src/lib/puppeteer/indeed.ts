import path from 'path';
import { ElementHandle, Page } from 'puppeteer';
import { repeatActionUntilBeingNavigated } from './common';
import { DistanceSearchOption } from '../../types/indeed';

const INDEED_HOME_URL = 'https://www.indeed.com/';
const INDEED_JOBS_URL = 'https://de.indeed.com/jobs';
const SECURITY_CHECK_STRING = 'Checking if the site connection is secure';

class Indeed {
  private page: Page;
  private apiPage: Page; // requests api
  private homeURL: string;
  private jobsURL: string;
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
    this.jobsURL = options?.jobsURL ?? INDEED_JOBS_URL;
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
   * Retrieve a text of job title in the job description section and returns it
   * @returns Job title
   */
  async getJobTitleText() {
    try {
      const jobTitle = await this.page.waitForSelector(
        'h2.jobsearch-JobInfoHeader-title'
      );
      return await jobTitle.evaluate((el) => el.textContent);
    } catch (e) {
      console.error(this.getJobTitleText.name, e);
      throw new Error(e);
    }
  }

  /**
   * Retrieve a text of job description in the job description section and returns it
   * @returns Job description
   */
  async getJobDescriptionText() {
    try {
      const jobDescription = await this.page.waitForSelector(
        '#jobDescriptionText'
      );
      return await jobDescription.evaluate((el) => el.textContent);
    } catch (e) {
      console.error(this.getJobDescriptionText.name, e);
      throw new Error(e);
    }
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
        const count = Number(splitText[i]);

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
    this.tmSecurityCheck = setInterval(async () => {
      if (previousUrl !== this.page.url()) {
        previousUrl = this.page.url();
        return;
      }

      // When the page stays on the same page before.
      const source = await this.page.content();

      const idx = source.indexOf(this.securityCheckString);
      if (idx >= 0) {
        if (!isSecurityCheckSite) cb();

        isSecurityCheckSite = true;
      } else {
        isSecurityCheckSite = false;
      }
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
    let jobTitles = await this.getJobTitles();

    const jobCardClick = async (idx: number) => {
      const jobCard = await this.getJobCardFromJobTitle(jobTitles[idx]);

      await jobCard.click();

      try {
        await repeatActionUntilBeingNavigated(this.page, async () => {
          try {
            await jobCard.click();
          } catch (e) {
            console.error(`${this.generatorJobList.name}`, e);
          }
        });
      } catch {
        // as navigation is sometimes failed,
        // when the error happens, just keep searching for jobs.
      }
    };

    // As the first job card is selected by default, skip the first item.
    for (let i = 1; i < jobTitles.length; i++) {
      try {
        yield {
          title: await this.getJobTitleText(),
          description: await this.getJobDescriptionText(),
          url: this.getCurrentUrl(),
        };

        await jobCardClick(i);
      } catch (e) {
        // When the error happens, retry after refreshing it.
        console.error(`${this.generatorJobList.name}`, e);
        this.page.reload();
        await (() =>
          new Promise<void>((resolve) => {
            this.page.waitForNavigation().then(() => resolve());
          }))();

        // After refreshing the page, as the html elements are updated, it gets jobTitle again.
        jobTitles = await this.getJobTitles();

        // Somehow, if there is no item to access more, breaks the loop.
        if (i >= jobTitles.length) {
          break;
        }

        i--;
      }
    }
  }

  /**
   * Returns generator that interates through all jobs
   */
  async *generatorAllJobs() {
    let idx = 0;
    let hasNextPage = true;

    while (hasNextPage) {
      for await (const jobInfo of this.generatorJobList()) {
        yield {
          ...jobInfo,
          idx: idx++,
        };
      }

      hasNextPage = await this.nextPage();
    }
  }

  /**
   * Navigate to the next page
   * @returns if the current page is the last page, it returns true, otherwise it returns false.
   */
  async nextPage() {
    try {
      const nav = await this.page.waitForSelector('nav[aria-label=pagination]');
      const paginationButtons = await nav.$$('div');

      for (let i = 0; i < paginationButtons.length; i++) {
        // If it is not the last page
        if (i === paginationButtons.length - 1) break;

        try {
          // if it has a button element, it is a current page.
          await paginationButtons[i].waitForSelector('button', {
            timeout: 100,
          });

          await repeatActionUntilBeingNavigated(this.page, async () => {
            try {
              await paginationButtons[i + 1].click();
            } catch (e) {
              console.error(
                `${this.nextPage.name} [repeatActionUntilBeingNavigated]`,
                e
              );
            }
          });

          return true;
        } catch {
          // when it is not a current page, do nothing
        }
      }

      return false;
    } catch (e) {
      console.error(this.nextPage.name, e);
      throw new Error(e);
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
    return await element.evaluate((el) =>
      el.id.substring(`jobTitle-`.length + 1)
    );
  } catch (e) {
    console.error(getJobIdFromJobTitle.name, e);
    throw new Error(e);
  }
};

export { getJobIdFromJobTitle };

export default Indeed;
