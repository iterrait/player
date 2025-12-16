import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';

import { BaseComponent } from '@iterra/app-lib/directives';

import { DownloadService } from '$services/download.service';
import { ElectronService } from '$services/electron.service';
import { MediaObject } from '$types/media-objects.types';

@Component({
  selector: 'single-video-media-object',
  standalone: true,
  imports: [
    AsyncPipe,
  ],
  templateUrl: './single-video-media-object.component.html',
  styleUrls: ['./single-video-media-object.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SingleVideoMediaObjectComponent extends BaseComponent {
  public currentMedia = input<MediaObject | null>(null);
  public videoDurationChanged = output<number>();

  private downloadService = inject(DownloadService);
  private electronService = inject(ElectronService);

  constructor() {
    super();

    effect(() => {
      const media = this.currentMedia()?.media;

      if (media) {
        this.electronService.ipcRenderer.send('downloadMedia', {
          mediaList: [{
            url: media.minioUrl,
            fileName: media.id,
            type: media.mimeType.split('/')[1],
          }],
        });
      }
    });
  }

  protected media = computed(() => {
    const file = this.currentMedia()?.media;

    if (!file) {
      return null;
    }

    return this.downloadService.getFile(file, 'video');
  });

  protected loadedSingleData(singleVideo: HTMLVideoElement): void {
    this.videoDurationChanged.emit(singleVideo?.duration);
  }
}
