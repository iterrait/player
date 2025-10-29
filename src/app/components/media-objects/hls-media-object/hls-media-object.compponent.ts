import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';
import Hls from 'hls.js';

import { BaseComponent } from '@iterra/app-lib/directives';

import { MediaObject } from '$types/media-objects.types';
import { HlsMediaObjectService } from './hls-media-object.service';

@Component({
  selector: 'hls-media-object',
  standalone: true,
  templateUrl: './hls-media-object.component.html',
  styleUrls: ['./hls-media-object.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [HlsMediaObjectService],
})
export class HlsMediaObjectCompponent extends BaseComponent {
  public currentMedia = input<MediaObject | null>(null);

  protected videoElementRef = viewChild<ElementRef<HTMLVideoElement>>('videoElement');

  private hlsMediaObjectService = inject(HlsMediaObjectService);

  private hls: Hls | null = null;

  constructor() {
    super();

    effect(() => {
      const video = this.videoElementRef()?.nativeElement as HTMLVideoElement;
      const hls = this.currentMedia()?.config['stream'] as string;

      this.loadBroadcast(video, hls);
    });
  }

  private loadBroadcast(video: HTMLVideoElement, hls: string): void {
    if (!video || !hls) return;

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hls;
    } else {
      // Получение объекта hls
      if (this.hlsMediaObjectService.hlsObjects[hls]) {
        this.hls = this.hlsMediaObjectService.hlsObjects[hls];
      } else {
        this.hls = new Hls();
        this.hlsMediaObjectService.addHlsObject(hls, this.hls);
      }

      this.hls.loadSource(hls);
      this.hls.attachMedia(video);
    }

    video.play().then();
  };
}
