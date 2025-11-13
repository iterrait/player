import { AsyncPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CountdownComponent, CountdownConfig, CountdownEvent } from 'ngx-countdown';
import { from, tap } from 'rxjs';

import { ElectronService } from '$services/electron.service';

@Component({
  selector: 'link-description-modal',
  standalone: true,
  imports: [
    AsyncPipe,
    CountdownComponent,
  ],
  templateUrl: './link-description-modal.component.html',
  styleUrls: ['./link-description-modal.component.scss']
})
export class LinkDescriptionModalComponent {
  private electronService = inject(ElectronService);
  private router = inject(Router);

  protected config: CountdownConfig = {
    leftTime: 10,
  };

  protected isLinkedPlayer = computed(() => (
    from(this.electronService.ipcRenderer.invoke('getIsPlayerLinked'))
  ));

  protected goToSettings(): void {
    this.router.navigate(['settings'], {
      queryParams: { tab: 'cloud' },
    }).then();
  }

  protected handleEvent(event: CountdownEvent): void {
    if (event.action === 'done') {
      this.electronService.ipcRenderer.send('closeLinkDescriptionModal');
    }
  }
}
