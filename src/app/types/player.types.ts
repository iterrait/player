export interface Player {
  id: string;
  name: string;
  description: string;
  address: string;
  location: {
    id: string;
    name: string;
  },
  capsule: {
    id: string;
    name: string;
  },
  project: {
    id: string;
    domain: string;
    systemName: string;
  },
  avatar: string;
  playlist: {
    id: string;
    name: string;
  },
  startAt: string;
  endAt: string;
}

export interface PlayerStatus {
  id: string;
  status: Status;
  statusAt: string;
  screenshot: string;
}

export type Status = 'updated' | 'sleeping' | 'awake' | 'running' | 'connected' | 'working';
