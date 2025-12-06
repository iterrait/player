import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiBaseService } from '@iterra/app-lib/services';

import { AdminService } from '$services/admin.service';
import { FilesWithPaginator } from '$types/files.types';
import { Player, PlayerStatus } from '$types/player.types';
import { NewspaperPostWithPaginator, Playlist } from '$types/playlists.types';

@Injectable({
  providedIn: 'root',
})
export class PlayerApiService extends ApiBaseService {
  private adminService = inject(AdminService);

  protected override API = signal(`https://player.${this.adminService.domain()}/v1`);
  protected domainApi = computed(() => `https://player.${this.adminService.domain()}/v1`);

  public getPLayerInfo(playerId: string): Observable<Player> {
    this.API = signal(`https://player.iterra.world/v1`);
    return this.getEntity<Player>(`players/${playerId}`);
  }

  public getPlaylist(playerId: string): Observable<Playlist> {
    this.API.set(this.domainApi());
    return this.getEntity<Playlist>(`playlists/${playerId}`, { isShow: true });
  }

  public getNewspaperPosts(playerId: string, widgetId: string): Observable<NewspaperPostWithPaginator> {
    this.API.set(this.domainApi());
    return this.getEntity<NewspaperPostWithPaginator>(`newspaper/${playerId}/posts/${widgetId}`);
  }

  public linkPLayer(code: string, token: string): Observable<Player> {
    this.API.set(this.domainApi());
    return this.postEntity<Player>(`players/device`, { code, token });
  }

  public sendStatus(playerId: string, data: FormData): Observable<PlayerStatus> {
    this.API.set(this.domainApi());
    return this.postEntity<PlayerStatus>(`players/${playerId}`, data);
  }

  public getMedia(playerId: string, mediaIds: string[]): Observable<FilesWithPaginator> {
    this.API.set(this.domainApi());
    return this.getEntity<FilesWithPaginator>(`media/${playerId}`, { mediaIds });
  }
}
