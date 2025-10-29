import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ApplicationConfig, importProvidersFrom, inject, provideAppInitializer } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideToastr } from 'ngx-toastr';

import { ItIconModule } from '@iterra/app-lib/it-icons';

import { ICONS } from '$constants/icons.config';
import { requestBearerInterceptor } from '$interceptors/request-bearer.interceptor';
import { AppInitService } from '$services/app-init.service';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(
      ItIconModule.forRoot({
        icons: ICONS,
        size: 14,
      }),
    ),
    provideAnimations(),
    provideAppInitializer(() => inject(AppInitService).initApp()),
    provideHttpClient(
      withInterceptors([requestBearerInterceptor]),
    ),
    provideRouter(routes, withHashLocation()),
    provideToastr({
      positionClass: 'toast-bottom-right',
    }),
  ]
};
