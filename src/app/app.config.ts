import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ApplicationConfig, importProvidersFrom, inject, provideAppInitializer } from '@angular/core';
import {
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
} from '@angular/material/core';
import * as dayjs from 'dayjs';
import 'dayjs/locale/ru';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideToastr } from 'ngx-toastr';

import { ItIconModule } from '@iterra/app-lib/it-icons';

import { ICONS } from '$constants/icons.config';
import { requestBearerInterceptor } from '$interceptors/request-bearer.interceptor';
import { AppInitService } from '$services/app-init.service';
import { routes } from './app.routes';

dayjs.locale('ru');
dayjs.extend(customParseFormat);
dayjs.extend(localizedFormat);

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
    { provide: MAT_DATE_LOCALE, useValue: 'ru' },
    // Кастомные форматы
    {
      provide: MAT_DATE_FORMATS,
      useValue: {
        parse: {
          dateInput: 'DD.MM.YYYY',
        },
        display: {
          dateInput: 'DD.MM.YYYY',
          monthYearLabel: 'MMMM YYYY',
          dateA11yLabel: 'LL',
          monthYearA11yLabel: 'MMMM YYYY',
        },
      }
    },
  ]
};
