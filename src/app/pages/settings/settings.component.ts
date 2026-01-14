import { Component, inject, signal } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { ActivatedRoute } from '@angular/router';

import { BaseComponent } from '@iterra/app-lib/directives';

import { PlayerInfoComponent } from '$components/player-info/player-info.component';
import { AboutComponent } from '$pages/about/about.component';
import { CloudConnectionComponent } from '$pages/settings/cloud-connection/cloud-connection.component';
import { ElectronService } from '$services/electron.service';

@Component({
  selector: 'settings',
  standalone: true,
  imports: [
    AboutComponent,
    CloudConnectionComponent,
    MatTabsModule,
    PlayerInfoComponent,
  ],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent extends BaseComponent {
  private activatedRoute = inject(ActivatedRoute);
  private electronService = inject(ElectronService);

  protected currentTabIndex = signal(0);
  protected tabs = ['info', 'cloud', 'local'];

  constructor() {
    super();

    this.activatedRoute.queryParams
      .pipe(this.takeUntilDestroy())
      .subscribe((params) => {
        const index = this.tabs.findIndex((tab) => tab === params['tab']);

        if (index > -1) {
          this.currentTabIndex.set(index);
        }
      });
  }

  protected onTabChange(index: number) {
    this.currentTabIndex.set(index);
  }
}
