import { File } from '$types/files.types';
import { MediaObject } from '$types/media-objects.types';

export interface Playlist {
  id: string;
  name: string;
  location: {
    id: string;
    name: string;
  };
  mediaObjects: MediaObject[];
}

export interface PlaylistWithPaginator {
  data: Playlist[];
  count: number;
  countPage: number;
  page: number;
  size: number;
}

export interface NewspaperPostWithPaginator {
  data: NewspaperPost[];
  count: number;
  countPage: number;
  page: number;
  size: number;
}

export interface NewspaperPost {
  id: string;
  status: NewspaperPostStatus;
  createdAt: string;
  updatedAt: string;
  post: {
    id: string;
    content: NewspaperPostContent;
    postLink?: string;
    author: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      username: string;
      avatar: string | null;
    };
    widget: {
      id: string;
      name: string;
      logo: string | null;
    };
    mediaList: File[] | null;
    createdAt: string;
    updatedAt: string;
  };
  widget: AdminWidget;
}

export type NewspaperPostStatus = 'published'
  | 'draft'
  | 'forModeration'
  | 'rejected'
  | 'unpublishedByAuthor'
  | 'unpublishedByModerator'
  | 'deleted'
  | 'repost';

export interface NewspaperPostContent {
  id: string;
  name: string;
  data: {
    blocks: NewspaperPostContentBlock[];
    time: string;
    version?: string;
  };
}

export interface NewspaperPostContentBlock {
  data: Record<string, any>;
  id: string;
  type: 'paragraph' | 'carousel';
}

export interface AdminWidget {
  id: string;
  name: string;
  logo?: string;
}
