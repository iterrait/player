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
import { DownloadService } from '$services/download.service';
import { ElectronService } from '$services/electron.service';
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

  private downloadService = inject(DownloadService);
  private electronService = inject(ElectronService);
  private newspaperMediaObjectService = inject(NewspaperMediaObjectService);

  protected player = this.newspaperMediaObjectService.player;

  protected fontSize = signal(56);
  protected marqueeFontSize = signal(24);

  protected qrWidth = computed(() => (this.params().backgroundWidth ?? 256) - 120);

  protected backgroundAnimationLogo = computed(() => {
    const file = this.currentPost()?.widget?.logo;

    if (!file) {
      return null;
    }

    return this.getFile(file);
  });

  protected qrCode = computed(() => {
    const player = this.player();
    const postLink = this.currentPost()?.post.postLink;

    if (player && postLink) {
      return postLink;
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
          this.downloadLogo();
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

  private getFile(file: string): Promise<string | null> {
    return this.checkFile(file) ?? file;
  }

  private checkFile(link: string): Promise<string | null> {
    const dataLink = link.split('/');
    const name = dataLink[dataLink.length - 1];

    return this.downloadService.checkMediaByName(name, link).then((result) => {
      return !!result
        ? `data:image/png;base64,${result}`
        : null;
    });
  }

  private downloadLogo(): void {
    const currentPost = this.currentPost();

    if (!currentPost?.post?.widget?.logo) {
      return;
    }

    const dataLink = currentPost.post.widget.logo.split('/');
    const file = dataLink[dataLink.length - 1].split('.');

    const mediaList = [{
      url: currentPost.post.widget.logo,
      fileName: file[0],
      type: file[1],
    }];

    this.electronService.ipcRenderer.send('downloadMedia', { mediaList });
  }
}
