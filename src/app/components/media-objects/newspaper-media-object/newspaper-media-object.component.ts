import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  OnDestroy,
  signal,
  untracked,
  viewChild
} from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { finalize, from, tap } from 'rxjs';

import { BaseComponent } from '@iterra/app-lib/directives';

import { AnimationBackgroundComponent } from '$components/animation-background/animation-background.component';
import { NewspaperMediaObjectService } from '$components/media-objects/newspaper-media-object/newspaper-media-object.service';
import { PlayerApiService } from '$services/api/player.api.service';
import { DownloadService } from '$services/download.service';
import { ElectronService } from '$services/electron.service';
import { MediaObject, NewspaperMediaObjectParams } from '$types/media-objects.types';
import { NewspaperPost } from '$types/playlists.types';

@Component({
  selector: 'newspaper-media-object',
  standalone: true,
  imports: [
    AsyncPipe,
    AnimationBackgroundComponent,
  ],
  templateUrl: './newspaper-media-object.component.html',
  styleUrls: ['./newspaper-media-object.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewspaperMediaObjectComponent extends BaseComponent implements OnDestroy {
  public currentMedia = input<MediaObject | null>(null);
  public playerId = input<string | null>(null);

  public postCanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('postCanvas');
  public postImage = viewChild<ElementRef<HTMLImageElement>>('postImage');
  public marqueeTextContainer = viewChild<ElementRef<HTMLDivElement>>('marqueeTextContainer');

  private changeDetectorRef = inject(ChangeDetectorRef);
  private downloadService = inject(DownloadService);
  private electronService = inject(ElectronService);
  private newspaperMediaObjectService = inject(NewspaperMediaObjectService);
  private playerApiService = inject(PlayerApiService);
  private toastrService = inject(ToastrService);

  protected windowWidth = 0;
  protected windowHeight = 0;
  protected posts = signal<NewspaperPost[]>([]);
  protected currentPostIndex = this.newspaperMediaObjectService.currentPostIndex;
  protected currentPost = signal<NewspaperPost | null>(null);
  protected postTimeoutId: NodeJS.Timeout | null = null;
  protected newspaperBroadcast = this.newspaperMediaObjectService.newspaperBroadcast;

  protected marqueeFontSize = 0;
  protected defaultMarqueeSpeed = 9;
  protected defaultMarqueeHeight = 65;
  protected marqueeSpeed = this.defaultMarqueeSpeed;
  protected marqueeText = '';
  protected localBasePath = signal('');

  protected config = computed(() => this.currentMedia()?.config as NewspaperMediaObjectParams);
  protected textBlock = computed(() => {
    const blocks = this.currentPost()?.post.content.data.blocks ?? [];

    if (!blocks.length) {
      return null;
    }

    return blocks.find((item: Record<string, any>) => item['type'] === 'paragraph');
  });

  protected imagePath = computed(() => {
    const mediaList = this.currentPost()?.post.mediaList ?? [];

    if (!mediaList.length) {
      return null;
    }

    return this.downloadService.getFile(mediaList[0]);
  });

  constructor() {
    super();

    this.windowHeight = window.innerHeight;
    this.windowWidth = window.innerWidth;

    effect(() => {
      const currentMedia = this.currentMedia();
      const playerId = this.playerId();

      if (currentMedia && playerId) {
        const newspaper = this.newspaperBroadcast[currentMedia.id];

        if (!newspaper) {
          this.getNewspaperPosts();
        } else {
          untracked(() => {
            this.posts.set(this.newspaperBroadcast[this.currentMedia()!.id].posts);
            this.setCurrentPostIndex();
            this.processingPosts();
          });
        }
      }
    });

    from(this.electronService.ipcRenderer.invoke('getLocalPath'))
      .pipe(this.takeUntilDestroy())
      .subscribe({
        next: (localPath) => {
          this.localBasePath.set(localPath);
        },
      });
  }

  public override ngOnDestroy() {
    super.ngOnDestroy();

    if (this.postTimeoutId) {
      clearTimeout(this.postTimeoutId);
    }
  }

  protected onLoadPostImage(): void {
    const ctx = this.postCanvas().nativeElement.getContext('2d');
    if (!ctx || !this.postImage()?.nativeElement || !this.postCanvas()) return;

    ctx.drawImage(
      this.postImage()!.nativeElement!,
      0,
      0,
      this.postCanvas().nativeElement.width,
      this.postCanvas().nativeElement.height,
    );
  }

  private processingPosts(): void {
    const currentMedia = this.currentMedia();
    if (!currentMedia) return;

    this.clearTimeoutId();
    this.addPost();

    this.postTimeoutId = setInterval(() => {
      this.setCurrentPostIndex();
      this.addPost();
    }, (this.config()?.postTimeSec ?? 10) * 1000);
  }

  private addPost(): void {
    this.currentPost.set(this.posts()?.[this.currentPostIndex()] ?? null);
    this.changeDetectorRef.detectChanges();

    if (this.config().hasMarquee) {
      this.addMarquee();
    }
  }

  private setCurrentPostIndex(): void {
    this.changeDetectorRef.detectChanges();

    let index = this.currentPostIndex() ?? 0;
    let currentPostIndex = 0;

    if (this.posts()?.length) {
      const nextIndex = (index === this.posts()?.length - 1) ? 0 : index + 1;
      currentPostIndex = nextIndex;
    } else {
      currentPostIndex = 0;
    }
    this.currentPostIndex.set(currentPostIndex);

    if (currentPostIndex === 0) {
      this.getNewspaperPosts();
    }

    if (this.currentMedia()) {
      this.newspaperBroadcast[this.currentMedia()!.id].index = currentPostIndex;
    }
  }

  private addMarquee():void{
    if (!this.marqueeTextContainer()?.nativeElement) return;

    this.marqueeFontSize = (this.config().marqueeHeight ?? 0) * 0.8;
    this.marqueeText = this.textBlock()?.data['text'] ?? '';

    this.changeDetectorRef.detectChanges();
    // получаем ширину за вычетом padding-left: 100%
    const width = this.marqueeTextContainer()!.nativeElement.clientWidth!;
    let percent = 1;

    if (width > 3000) {
      percent = width / 3500;
    }

    this.marqueeSpeed = (this.config().marqueeSpeed ?? this.defaultMarqueeSpeed) * percent;
    this.changeDetectorRef.detectChanges();
  }

  private drawCanvasVideo(
    video: HTMLVideoElement,
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number): void {
    if (video.paused || video.ended) return;

    ctx.drawImage(video, 0, 0, width, height);
    setTimeout(() => {
      this.drawCanvasVideo(video, ctx, width, height)
    }, 20);
  }

  private clearTimeoutId(): void {
    if (this.postTimeoutId) {
      clearInterval(this.postTimeoutId);
    }
  }

  private getNewspaperPosts(): void {
    const currentMedia = this.currentMedia();
    const playerId = this.playerId();

    if (!playerId || !currentMedia || !this.config()?.widgetId) return;
    this.playerApiService.getNewspaperPosts(playerId, this.config()!.widgetId!)
      .pipe(
        tap((postsWithPaginator) => {
          this.posts.set(postsWithPaginator.data);

          this.newspaperBroadcast[currentMedia.id] = {
            posts: postsWithPaginator.data,
            index: 0,
          };
        }),
        tap(() => {
          const mediaList = this.posts().reduce((acc: Record<string, any>[], curr) => {
            const file = curr.post.mediaList?.[0] ?? null;

            if (file) {
              acc.push({
                url: file.minioUrl,
                fileName: file.id,
                type: file.mimeType.split('/')[1],
              });
            }

            return acc;
          }, []);

          this.electronService.ipcRenderer.send('downloadMedia', { mediaList });
        }),
        finalize(() => this.processingPosts()),
        this.takeUntilDestroy()
      )
      .subscribe({
        error: (error: ErrorEvent) => {
          this.toastrService.error(error.error.detail ?? 'Ошибка получения постов для стенгазеты');
        },
      });
  }
}
