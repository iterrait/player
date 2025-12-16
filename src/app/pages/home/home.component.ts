import {
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { switchMap, tap } from 'rxjs';

import { BaseComponent } from '@iterra/app-lib/directives';

import { HlsMediaObjectCompponent } from '$components/media-objects/hls-media-object/hls-media-object.compponent';
import { NewspaperMediaObjectComponent } from '$components/media-objects/newspaper-media-object/newspaper-media-object.component';
import { NewspaperMediaObjectService } from '$components/media-objects/newspaper-media-object/newspaper-media-object.service';
import { SingleImageMediaObjectComponent } from '$components/media-objects/single-image-media-object/single-image-media-object.component';
import { SingleVideoMediaObjectComponent } from '$components/media-objects/single-video-media-object/single-video-media-object.component';
import { AdminService } from '$services/admin.service';
import { PlayerApiService } from '$services/api/player.api.service';
import { DayjsService } from '$services/dayjs.service';
import { ElectronService } from '$services/electron.service';
import { MediaObject } from '$types/media-objects.types';
import { Notice } from '$types/notice.types';
import { Playlist } from '$types/playlists.types';

@Component({
  selector: 'home',
  standalone: true,
  imports: [
    HlsMediaObjectCompponent,
    NewspaperMediaObjectComponent,
    SingleImageMediaObjectComponent,
    SingleVideoMediaObjectComponent,
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  providers: [NewspaperMediaObjectService],
})
export class HomeComponent extends BaseComponent {
  private adminService = inject(AdminService);
  private changeDetectorRef = inject(ChangeDetectorRef);
  private dayjsService = inject(DayjsService);
  private electronService = inject(ElectronService);
  private newspaperMediaObjectService = inject(NewspaperMediaObjectService);
  private playerApiService = inject(PlayerApiService);
  private toastrService = inject(ToastrService);

  protected currentMedia = signal<MediaObject | null>(null);
  protected isOnline = signal(true);
  protected mediaIndex = signal<number>(0);
  protected mediaObjectTimeoutId: NodeJS.Timeout | null = null;
  protected statusTimeoutId: NodeJS.Timeout | null = null;
  protected player = this.newspaperMediaObjectService.player;
  protected playlist = signal<Playlist | null>(null);

  protected mediaList = computed(() => this.playlist()?.mediaObjects ?? []);
  protected statusInterval = 3600000;

  constructor() {
    super();

    this.electronService.ipcRenderer.addListener('getPlayerInfo', (
      event,
      playerId: string,
    ) => (this.getPlayerInfo(playerId)));

    this.electronService.ipcRenderer.addListener('playerStart', (
      event,
    ) => (this.playlistStart()));

    this.electronService.ipcRenderer.addListener('showNotice', (
      event,
      data: Notice,
    ) => {
      this.toastrService[data.status](data.message);
    });

    this.electronService.ipcRenderer.addListener('playerStop', (
      event,
    ) => (this.playlistStop()));

    this.statusTimeoutId = setInterval(() => {
      this.electronService.ipcRenderer.send('setStatus', 'working');
    }, this.statusInterval);
  }

  private getPlayerInfo(playerId: string): void {
    if (!playerId) return;

    this.playerApiService.getPLayerInfo(playerId)
      .pipe(
        tap((player) => {
          this.player.set(player);
          this.adminService.domain.set(player.project.domain);
          this.adminService.projectSysname.set(player.project.systemName);
        }),
        switchMap(() => this.playerApiService.getPlaylist(playerId)),
        this.takeUntilDestroy(),
      )
      .subscribe({
        next: (playlist) => {
          this.playlist.set({
            ...playlist,
            mediaObjects: playlist.mediaObjects.filter((item) => {
              if (!item.startAt || !item.endAt) {
                return true;
              }
              const startAt = this.dayjsService.fromDate(new Date(item.startAt));
              const endAt = this.dayjsService.fromDate(new Date(item.endAt));
              const currentDay =  this.dayjsService.now();

              return this.dayjsService.isBetween(currentDay, startAt, endAt);
            }),
          });

          this.electronService.ipcRenderer.send('setPlayerData', this.player());
        },
        error: (error: ErrorEvent) => {
          this.toastrService.error(error.error.detail ?? 'Ошибка получения данных для плеера');
        },
      });
  }

  protected changeDurationMediaObject(duration: number): void {
    this.clearTimeouts();
    this.getNextShowMediaObject(duration
      ?? this.mediaList()[this.mediaIndex()].duration
      ?? 0);
  }

  private playlistStart(): void {
    this.mediaIndex.set(0);
    this.showMediaObject();
  }

  private playlistStop(): void {
    this.clearMedia();
  }

  private showMediaObject(): void {
    if (!this.mediaList().length) return;

    this.currentMedia.set(this.mediaList()[this.mediaIndex()]);
    this.changeDetectorRef.detectChanges();

    const duration = this.mediaList()[this.mediaIndex()].duration;
    if (!duration) return;

    this.getNextShowMediaObject(duration);
  }

  private clearMedia(): void {
    this.clearTimeouts();

    this.currentMedia.set(null);
    this.mediaIndex.set(0);
    this.changeDetectorRef.detectChanges();
  }

  private getNextShowMediaObject(duration: number): void {
    this.mediaObjectTimeoutId = setTimeout(() => {
      let index = this.mediaIndex();

      const isLast = (index === this.mediaList().length - 1);
      const nextIndex = isLast ? 0 : index + 1;

      if (isLast) {
        this.updateConfig();
      }

      this.mediaIndex.set(nextIndex);

      this.showMediaObject();
    }, duration * 1000);
  }

  private updateConfig(): void {
    const id = this.player()?.id;

    if (!id) return;
    this.playerApiService.getPlaylist(id)
      .pipe(this.takeUntilDestroy())
      .subscribe({
        next: (playlist) => this.playlist.set(playlist),
      });
  }

  private clearTimeouts(): void {
    if (this.mediaObjectTimeoutId) {
      clearTimeout(this.mediaObjectTimeoutId);
    }
  }
}
