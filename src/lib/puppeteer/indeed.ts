import { ElementHandle, Page } from 'puppeteer';
import { repeatActionUntilBeingNavigated } from './common';
import { DistanceSearchOption } from '../../types/indeed';

const INDEED_HOME_URL = 'https://www.indeed.com/';
const INDEED_JOBS_URL = 'https://de.indeed.com/jobs';

class Indeed {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigateHome() {
    try {
      this.page.goto(INDEED_HOME_URL);
      await this.page.waitForNavigation();
    } catch (e) {
      console.error(this.navigateHome.name, e);
      throw new Error(e);
    }
  }

  async setSearchKeyword(keyword: string) {
    try {
      await this.page.type('#text-input-what', keyword);
    } catch (e) {
      console.error(this.setSearchKeyword.name, e);
      throw new Error(e);
    }
  }

  async setLocation(location: string) {
    try {
      await this.page.type('#text-input-where', location);
    } catch (e) {
      console.error(this.setLocation.name, e);
      throw new Error(e);
    }
  }

  getCurrentSearchParams() {
    try {
      const url = this.page.url();
      return new URLSearchParams(url.substring(url.lastIndexOf('?') + 1));
    } catch (e) {
      console.error(this.getCurrentSearchParams.name, e);
      throw new Error(e);
    }
  }

  getCurrentUrl() {
    try {
      return this.page.url();
    } catch (e) {
      console.error(this.getCurrentUrl.name, e);
      throw new Error(e);
    }
  }

  async getJobTitles() {
    try {
      return await this.page.$$('span[id^=jobTitle-]');
    } catch (e) {
      console.error(this.getJobTitles.name, e);
      throw new Error(e);
    }
  }

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

  async *generatorJobInfo() {
    const jobTitles = await this.getJobTitles();

    for (let i = 0; i < jobTitles.length; i++) {
      const jobCard = await this.getJobCardFromJobTitle(jobTitles[i]);
      jobCard.click();
      await this.page.waitForNavigation();

      yield {
        title: await this.getJobTitleText(),
        description: await this.getJobDescriptionText(),
      };
    }
  }

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
   * navigate to the next page
   * @returns if the current page is the last page, it returns true, otherwise it returns false.
   */
  async nextPage() {
    try {
      const nav = await this.page.waitForSelector('nav[aria-label=pagination]');
      const paginationButtons = await nav.$$('div');

      for (let i = 0; i < paginationButtons.length; i++) {
        // if it has a button element, it is a current page.
        const button = await paginationButtons[i].waitForSelector('button');
        if (button !== null) {
          // If it is not the last page
          if (i === paginationButtons.length - 1) break;

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
        }
      }

      return false;
    } catch (e) {
      console.error(this.nextPage.name, e);
      throw new Error(e);
    }
  }

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

  async search({
    keyword,
    location,
    distance,
  }: {
    keyword: string;
    location: string;
    distance?: DistanceSearchOption;
  }) {
    try {
      const searchUrl = encodeURI(
        `${INDEED_JOBS_URL}?${new URLSearchParams({
          q: keyword,
          l: location,
          ...(distance && { radius: distance }),
        }).toString()}`
      );
      this.page.goto(searchUrl);
      await this.page.waitForNavigation();
    } catch (e) {
      console.error(this.search.name, e);
      throw new Error(e);
    }
    // try {
    //   await this.setSearchKeyword(keyword);
    //   await this.setLocation(location);

    //   await repeatActionUntilBeingNavigated(this.page, async () => {
    //     try {
    //       const searchButton = await this.page.waitForSelector(
    //         '#jobsearch > button[type=submit]',
    //         {
    //           timeout: 250,
    //         }
    //       );
    //       searchButton?.click();
    //     } catch (e) {
    //       console.error(this.search.name, e);
    //     }
    //   });
    // } catch (e) {
    //   console.error(this.search.name, e);
    //   throw new Error(e);
    // }
  }

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
}

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
