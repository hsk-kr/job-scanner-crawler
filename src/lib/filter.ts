import fs from 'fs';
import { JobInfo } from '../types/indeed';
import { removeTags } from './puppeteer/common';

const recordJobInfosAsFile = async (filePath: string, jobInfos: JobInfo[]) => {
  return await fs.writeFileSync(filePath, JSON.stringify(jobInfos));
};

const countWord = (str: string, word: string) => {
  let cnt = 0;
  let idx = str.indexOf(word);
  while (idx !== -1) {
    cnt++;
    idx = str.indexOf(word, idx + 1);
  }

  return cnt;
};

/**
 *! This matches personal perference, the logic will be generalized later.
 */
const isJuniorReactPosition = (jobInfo: JobInfo) => {
  const jobTitle = jobInfo.jobTitle.toLowerCase();
  const jobDescription = removeTags(jobInfo.jobDescription).toLowerCase();

  try {
    // ignore lead and senior positions
    const isSeniorPosition = jobTitle.indexOf('senior') >= 0;
    const isLeadPosition = jobTitle.indexOf('lead') >= 0;
    if (isSeniorPosition || isLeadPosition) throw 'senior or lead position';

    // find a frontend position
    const isFrontPosition = jobTitle.indexOf('front') >= 0;
    const isReactPosition = jobTitle.indexOf('react') >= 0;
    const hasReactInJd = jobDescription.indexOf('react') >= 0;

    if ((!isFrontPosition && !isReactPosition) || !hasReactInJd) {
      throw 'not a front position';
    }

    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
};

/**
 *! This matches personal perference, the logic will be generalized later.
 */
const isInternshipPosition = (jobInfo: JobInfo) => {
  const jobTitle = jobInfo.jobTitle.toLowerCase();
  const jobDescription = removeTags(jobInfo.jobDescription).toLowerCase();

  try {
    // ignore lead and senior positions
    const isSeniorPosition = jobTitle.indexOf('senior') >= 0;
    const isLeadPosition = jobTitle.indexOf('lead') >= 0;
    if (isSeniorPosition || isLeadPosition) throw 'senior or lead position';

    // find a frontend position
    const isInternshipPosition =
      jobTitle.indexOf('intern') >= 0 || jobDescription.indexOf('intern') >= 0;
    if (!isInternshipPosition) throw 'not a internship position';

    // language
    let isGerman =
      countWord(jobDescription, 'wir ') >= 2 ||
      countWord(jobDescription, 'du ') >= 5;
    isGerman = isGerman && jobDescription.indexOf('international') === -1;
    isGerman = isGerman && jobDescription.indexOf('german is a plus') === -1;
    if (isGerman) throw 'is a German position';

    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
};

export { recordJobInfosAsFile, isJuniorReactPosition, isInternshipPosition };
