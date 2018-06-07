import { request } from "@dcos/http-service";
// TODO: remove this disable with https://jira.mesosphere.com/browse/DCOS_OSS-3579
// tslint:disable-next-line:no-submodule-imports
import { Observable } from "rxjs/Observable";
import Config from "../config/Config";

// Add interface information: https://jira.mesosphere.com/browse/DCOS-37725
export interface IJobResponse {
  id: string;
  labels?: object;
  run: {
    cpus: number;
    mem: number;
    disk: number;
    cmd: string;
    env: object;
    placement: {
      constraints: any[];
    };
    artifacts: any[];
  };
  schedules: ISchedule[];
  historySummary: {
    failureCount: number;
    lastFailureAt: string | null;
    lastSuccessAt: string | null;
    successCount: number;
  };
}

export interface IJobDetailResponse {
  id: string;
  description: string;
  labels: object;
  run: {
    cpus: number;
    mem: number;
    disk: number;
    cmd: string;
    env: {};
    placement: {
      constraints: any[];
    };
    artifacts: any[];
    maxLaunchDelay: number;
    volumes: any[];
    restart: {
      policy: string;
    };
    docker?: {
      secrets: object;
      forcePullImage: boolean;
      image: string;
    };
    secrets: object;
  };
  schedules: any[];
  activeRuns: any[];
  history: IJobHistory;
}
export interface ISchedule {
  concurrencyPolicy: string;
  cron: string;
  enabled: boolean;
  id: string;
  nextRunAt: string;
  startingDeadlineSeconds: number;
  timezone: string;
}

export interface IJobHistory {
  successCount: number;
  failureCount: number;
  lastSuccessAt: string;
  lastFailureAt: null;
  successfulFinishedRuns: IJobHistoryRun[];
  failedFinishedRuns: IJobHistoryRun[];
}

export interface IJobHistoryRun {
  id: string;
  createdAt: string;
  finishedAt: string;
}

export interface IJobData {
  id: string;
}

export interface IScheduleData {
  id: string;
}
const defaultHeaders = {
  "Content-Type": "application/json; charset=utf-8"
};

export function createJob(data: IJobData) {
  return request(`${Config.metronomeAPI}/v0/scheduled-jobs`, {
    method: "POST",
    body: JSON.stringify(data),
    headers: defaultHeaders
  });
}

export function fetchJobs(): Observable<IJobResponse[]> {
  return request(
    `${
      Config.metronomeAPI
    }/v1/jobs?embed=activeRuns&embed=schedules&embed=historySummary`,
    { headers: defaultHeaders }
  );
}

export function fetchJobDetail(jobID: string): Observable<IJobDetailResponse> {
  return request(
    `${
      Config.metronomeAPI
    }/v1/jobs/${jobID}?embed=activeRuns&embed=history&embed=schedules`,
    { headers: defaultHeaders }
  );
}

export function deleteJob(
  jobID: string,
  stopCurrentJobRuns = false
): Observable<any> {
  return request(
    `${
      Config.metronomeAPI
    }/v1/jobs/${jobID}?stopCurrentJobRuns=${stopCurrentJobRuns}`,
    { method: "DELETE", headers: defaultHeaders }
  );
}

export function updateJob(jobID: string, data: IJobData): Observable<any> {
  return request(
    `${
      Config.metronomeAPI
    }/v0/scheduled-jobs/${jobID}?embed=activeRuns&embed=history&embed=schedules`,
    {
      method: "PUT",
      body: JSON.stringify(data),
      headers: defaultHeaders
    }
  );
}

export function runJob(jobID: string): Observable<any> {
  return request(
    `${
      Config.metronomeAPI
    }/v1/jobs/${jobID}/runs?embed=activeRuns&embed=history&embed=schedules`,
    {
      headers: defaultHeaders,
      method: "POST",
      body: "{}"
    }
  );
}

export function stopJobRun(jobID: string, jobRunID: string): Observable<any> {
  return request(
    `${Config.metronomeAPI}/v1/jobs/${jobID}/runs/${jobRunID}/actions/stop`,
    { headers: defaultHeaders, method: "POST", body: "{}" }
  );
}

export function updateSchedule(
  jobID: string,
  data: IScheduleData
): Observable<any> {
  return request(
    `${Config.metronomeAPI}/v1/jobs/${jobID}/schedules/${data.id}`,
    { method: "PUT", headers: defaultHeaders, body: JSON.stringify(data) }
  );
}
