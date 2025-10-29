import { Component, signal } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';

import { PlayerInfoComponent } from '$components/player-info/player-info.component';
import { CloudConnectionComponent } from '$pages/settings/cloud-connection/cloud-connection.component';

@Component({
  selector: 'settings',
  standalone: true,
  imports: [
    CloudConnectionComponent,
    MatTabsModule,
    PlayerInfoComponent,
  ],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent {
  protected currentTabIndex = signal(0);

  protected onTabChange(index: number) {
    this.currentTabIndex.set(index);
  }

  protected onDeviceLinked(): void {
    this.currentTabIndex.set(0);
  }
}
