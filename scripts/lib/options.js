export const SMOKE_OPTIONS = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate==1'],
  },
};

export const LOAD_OPTIONS = {
  stages: [
    { duration: '10s', target: 1 },
    { duration: '10s', target: 5 },
    { duration: '30s', target: 5 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    checks: ['rate==1'],
    http_req_failed: ['rate<0.05'],
  },
};

export const STRESS_OPTIONS = {
  stages: [
    { duration: '10s', target: 5 },
    { duration: '15s', target: 10 },
    { duration: '20s', target: 20 },
    { duration: '30s', target: 30 },
    { duration: '30s', target: 40 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    checks: ['rate==1'],
    http_req_failed: ['rate<0.05'],
  },
};

export const ENDURANCE_OPTIONS = {
  stages: [
    { duration: '10s', target: 5 },
    { duration: '1m', target: 5 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    checks: ['rate==1'],
    http_req_failed: ['rate<0.05'],
  },
};

export const SCALABILITY_OPTIONS = {
  stages: [
    { duration: '10s', target: 1 },
    { duration: '10s', target: 2 },
    { duration: '10s', target: 3 },
    { duration: '10s', target: 5 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    checks: ['rate==1'],
    http_req_failed: ['rate<0.05'],
  },
};

export const VOLUME_RECORD_COUNT = 25;

export const VOLUME_OPTIONS = {
  vus: 1,
  iterations: 5,
  thresholds: {
    checks: ['rate==1'],
    http_req_failed: ['rate<0.05'],
  },
};

export const SPIKE_OPTIONS = {
  stages: [
    { duration: '10s', target: 1 },
    { duration: '1s', target: 20 },
    { duration: '30s', target: 20 },
    { duration: '1s', target: 1 },
    { duration: '10s', target: 1 },
    { duration: '1s', target: 0 },
  ],
  thresholds: {
    checks: ['rate==1'],
    http_req_failed: ['rate<0.05'],
  },
};
