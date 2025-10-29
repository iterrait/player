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

import { BaseComponent } from '@iterra/app-lib/directives';
import { ItIconModule } from '@iterra/app-lib/it-icons';

import { ElectronService } from '$services/electron.service';
import { File } from '$types/files.types';
import { NewspaperMediaObjectParams } from '$types/media-objects.types';

@Component({
  selector: 'animation-background',
  standalone: true,
  imports: [
    AsyncPipe,
    ItIconModule,
  ],
  templateUrl: './animation-background.component.html',
  styleUrls: ['./animation-background.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnimationBackgroundComponent extends BaseComponent implements AfterViewInit {
  public params = input.required<NewspaperMediaObjectParams>();
  public localBasePath = input.required<string>();

  public channel = viewChild<ElementRef<HTMLElement>>('channel');

  private electronService = inject(ElectronService);

  protected fontSize = signal(56);
  protected marqueeFontSize = signal(24);

  protected backgroundAnimationLogo = computed(() => {
    const file = this.params().backgroundAnimationLogoFile;

    if (!file) {
      return null;
    }

    return this.getFile(file);
  });

  protected backgroundAnimationQrFile = computed(() => {
    const file = this.params().backgroundAnimationQrFile;

    if (!file) {
      return null;
    }

    return this.getFile(file);
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

    if (params.backgroundAnimationQrFile) {
      files.push(params.backgroundAnimationQrFile);
    }

    const mediaList = files.reduce((acc: Record<string, any>[], curr) => {
      acc.push({
        mediaUrl: curr.minioUrl,
        fileName: curr.id,
        type: curr.mimeType.split('/')[1],
      });
      return acc;
    }, []);

    this.electronService.ipcRenderer.send('downloadMedia', { mediaList });
  }
}
