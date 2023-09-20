export type DistanceSearchOption = '10' | '25' | '35' | '50' | '75' | '100';

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
