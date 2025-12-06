import { AsyncPipe } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { QRCodeComponent } from 'angularx-qrcode';

import { BaseComponent } from '@iterra/app-lib/directives';
import { ItIconModule } from '@iterra/app-lib/it-icons';

import { NewspaperMediaObjectService } from '$components/media-objects/newspaper-media-object/newspaper-media-object.service';
import { ElectronService } from '$services/electron.service';
import { File } from '$types/files.types';
import { NewspaperMediaObjectParams } from '$types/media-objects.types';
import { NewspaperPost } from '$types/playlists.types';

@Component({
  selector: 'animation-background',
  standalone: true,
  imports: [
    AsyncPipe,
    ItIconModule,
    QRCodeComponent,
  ],
  templateUrl: './animation-background.component.html',
  styleUrls: ['./animation-background.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.width.px]': 'params().backgroundWidth',
    '[style.min-width.px]': 'params().backgroundWidth'
  }
})
export class AnimationBackgroundComponent extends BaseComponent implements AfterViewInit {
  public channel = viewChild<ElementRef<HTMLElement>>('channel');

  public params = input.required<NewspaperMediaObjectParams>();
  public localBasePath = input.required<string>();
  public widgetName = input.required<string>();
  public currentPost = input.required<NewspaperPost | null>();

  private electronService = inject(ElectronService);
  private newspaperMediaObjectService = inject(NewspaperMediaObjectService);

  protected player = this.newspaperMediaObjectService.player;

  protected fontSize = signal(56);
  protected marqueeFontSize = signal(24);

  protected qrWidth = computed(() => (this.params().backgroundWidth ?? 256) - 200);

  protected backgroundAnimationLogo = computed(() => {
    const file = this.params().backgroundAnimationLogoFile;

    if (!file) {
      return null;
    }

    return this.getFile(file);
  });

  protected qrCode = computed(() => {
    const player = this.player();
    const postId = this.currentPost()?.post.id;

    if (player?.project.domain && player?.location.id && this.params().widgetId && postId) {
      return `https://app.${player?.project.domain}/${player?.location.id}/widget/${this.params().widgetId}/${postId}`;
    }

    return null;
  });

  constructor() {
    super();

    effect(() => {
      const params = this.params();
      const localBasePath = this.localBasePath();

      if (params) {
        this.marqueeFontSize.set(Math.min(params.marqueeHeight ?? 0, params.backgroundWidth ?? 0) * 0.5);

        if (localBasePath) {
          this.downloadBackgroundMedia();
        }
      }
    });
  }

  public ngAfterViewInit(): void {
    this.changeFontSize();
  }

  protected changeFontSize(): void {
    const element = this.channel()?.nativeElement;

    if (!element) {
      return;
    }
  }

  private async checkMediaById(name: string): Promise<string | boolean> {
    return await this.electronService.ipcRenderer.invoke('checkLocalMedia', name);
  }

  private checkFile(file: File): Promise<string | null> {
    const name = `${file!.id}.${file!.mimeType.split('/')[1]}`;

    return this.checkMediaById(name).then((result) => {
      return !!result
        ? `data:image/png;base64,${result}`
        : null
    });
  }

  private getFile(file: File): Promise<string | null> {
    return this.checkFile(file) ?? file.minioUrl;
  }

  private downloadBackgroundMedia(): void {
    const params = this.params();
    const files = [];

    if (params.backgroundAnimationLogoFile) {
      files.push(params.backgroundAnimationLogoFile);
    }

    const mediaList = files.reduce((acc: Record<string, any>[], curr) => {
      acc.push({
        minioUrl: curr.minioUrl,
        fileName: curr.id,
        type: curr.mimeType.split('/')[1],
      });
      return acc;
    }, []);

    this.electronService.ipcRenderer.send('downloadMedia', { mediaList });
  }
}
