import { Routes } from '@angular/router';

import { LayoutBlankComponent } from '$layouts/layout-blank/layout-blank.component';

import { AboutComponent } from '$pages/about/about.component';
import { HomeComponent } from '$pages/home/home.component';
import { LinkDescriptionModalComponent } from '$pages/link-description-modal/link-description-modal.component';
import { SettingsComponent } from '$pages/settings/settings.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutBlankComponent,
    children: [
      { path: '', component: HomeComponent },
      { path: 'about', component: AboutComponent },
      { path: 'settings', component: SettingsComponent },
      { path: 'link-description', component: LinkDescriptionModalComponent},
    ]
  }
];
