export interface FilesWithPaginator {
  data: File[];
  count: number;
  countPage: number;
  page: number;
  size: number;
}

export interface File {
  id: string;
  name: string;
  minioUrl: string;
  expiresAt: string;
  preview: string;
  size: number;
  tags: Tag[];
  mimeType: string;
  iconPreview: string | null;
}

export interface FilesParams {
  capsuleId?: string;
  locationId?: string;
  tagIds?: string[];
}

export interface CreateFile {
  name: string;
  locationId: string;
}

export interface UpdateFileParams {
  name: string | null;
  tagIds: string[] | null;
}

export interface Tag {
  id: string;
  name: string;
  capsuleId: string;
  isSystem: boolean;
}

export interface CreateTag {
  name: string;
  capsuleId: string;
}
