import { File } from '$types/files.types';

export type MediaObjectType = 'image' | 'video' | 'stream' | 'newspaper';

export interface MediaObject {
  id: string;
  name: string;
  type: MediaObjectType;
  config: Record<string, any>
  duration: number;
  playlistId: string;
  media?: File;
  startAt: string | null;
  endAt: string | null;
}

export interface MediaObjectWithPaginator {
  data: MediaObject[];
  count: number;
  countPage: number;
  page: number;
  size: number;
}

export interface MediaObjectAdd {
  name: string;
  config: Record<string, any>;
  type: MediaObjectType;
  duration: number;
  playlistId: string;
  mediaId?: string;
}

export interface MediaObjectEdit {
  name: string;
  config: Record<string, any>;
  duration: number;
}

export interface NewspaperMediaObjectParams {
  widgetId: string | null;
  postTimeSec: number | null;
  limit: number | null;
  hasMarquee?: boolean | null;
  marqueeHeight?: number | null;
  marqueeSpeed?: number | null;
  backgroundWidth?: number | null;
  backgroundAnimationLogoFile?: File | null;
}
