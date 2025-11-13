import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { filter, finalize, from, switchMap } from 'rxjs';

import { BaseComponent } from '@iterra/app-lib/directives';

import { NotEmptyPipe } from '$pipes/not-empty.pipe';
import { PlayerApiService } from '$services/api/player.api.service';
import { ElectronService } from '$services/electron.service';
import { Player } from '$types/player.types';

@Component({
  selector: 'player-info',
  standalone: true,
  imports: [
    NotEmptyPipe,
  ],
  templateUrl: './player-info.component.html',
  styleUrls: ['./player-info.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerInfoComponent extends BaseComponent {
  protected player = signal<Player | null>(null);

  private electronService = inject(ElectronService);
  private playerApiService = inject(PlayerApiService);
  private toastrService = inject(ToastrService);

  protected isLoading = signal(false);

  constructor() {
    super();

    this.getPlayerInfo();
  }

  private getPlayerInfo(): void {
    this.isLoading.set(true);

    from(this.electronService.ipcRenderer.invoke('getPlayerId'))
      .pipe(
        filter((playerId) => !!playerId),
        switchMap((playerId) => this.playerApiService.getPLayerInfo(playerId)),
        finalize(() => this.isLoading.set(false)),
        this.takeUntilDestroy(),
      )
      .subscribe({
        next: (player) => {
          this.player.set(player);
        },
        error: (error: ErrorEvent) => {
          this.toastrService.error(error.error.detail ?? 'Ошибка получения данных плеера');
        },
      });
  }
}
