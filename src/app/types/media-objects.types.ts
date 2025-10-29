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
  theme: string | null;
  left: number | null;
  top: number | null;
  width: number | null;
  height: number | null;
  backgroundPostWidth?: number | null;
  backgroundPostHeight?: number | null;
  fitIntoScreen?: boolean | null;
  hasMarquee?: boolean | null;
  marqueeHeight?: number | null;
  marqueeSpeed?: number | null;
  backgroundLeft?: number | null;
  backgroundTop?: number | null;
  backgroundWidth?: number | null;
  backgroundHeight?: number | null;
  backgroundLayer?: string | null;
  backgroundType?: string | null;
  backgroundAnimationChannel?: string | null;
  backgroundAnimationLogoFile?: File | null;
  backgroundAnimationFile?: File | null;
  backgroundAnimationQrFile?: File | null;
}
