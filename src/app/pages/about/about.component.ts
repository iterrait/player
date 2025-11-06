import { AsyncPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { from } from 'rxjs';

import { ElectronService } from '$services/electron.service';

@Component({
  selector: 'about',
  standalone: true,
  imports: [
    AsyncPipe,
  ],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent {
  protected electronService = inject(ElectronService);

  protected version = computed(() => from(this.electronService.ipcRenderer.invoke('getVersion')));
}
