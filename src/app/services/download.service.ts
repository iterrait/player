import { inject, Injectable } from '@angular/core';

import { ElectronService } from '$services/electron.service';
import { File } from '$types/files.types';

type FileType = 'image' | 'video';

@Injectable({
  providedIn: 'root',
})
export class DownloadService {
  private electronService = inject(ElectronService);

  public getFile(file: File, type: FileType = 'image'): Promise<string | null> {
    return this.checkFile(file, type) ?? file.minioUrl;
  }

  public checkMediaByName(fileName: string, link: string): Promise<string | null> {
    return this.checkMediaById(fileName).then((result) => {
      return !!result ? result as string : link;
    });
  }

  private checkFile(file: File, type: FileType = 'image'): Promise<string | null> {
    const name = `${file!.id}.${file!.mimeType.split('/')[1]}`;

    return this.checkMediaById(name).then((result) => {
      return !!result
        ? `data:${type}/${type ==='image' ? 'png' : 'mp4'};base64,${result}`
        : file.minioUrl
    });
  }

  private async checkMediaById(name: string): Promise<string | boolean> {
    return await this.electronService.ipcRenderer.invoke('checkLocalMedia', name);
  }
}
