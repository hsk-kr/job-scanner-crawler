export const distanceSearchOptions = [
  '10',
  '25',
  '35',
  '50',
  '75',
  '100',
] as const;

export type DistanceSearchOption = (typeof distanceSearchOptions)[number];

export const isDistanceSearchOptionType = (
  value: any
): value is DistanceSearchOption => distanceSearchOptions.includes(value);

export interface ViewJobResponse {
  status: string;
  body: {
    jobInfoWrapperModel: {
      jobInfoModel: {
        jobInfoHeaderModel: {
          companyName: string;
          jobTitle: string;
        };
        sanitizedJobDescription: string;
      };
    };
  };
}
export interface JobInfo {
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  url: string;
}

export enum JobType {
  INTERN = 'intern',
  JUNIOR_REACT = 'junior_react',
}
