import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { filter, from, switchMap, tap } from 'rxjs';

import { ElectronService } from '$services/electron.service';

export const requestBearerInterceptor: HttpInterceptorFn = (request, next) => {
  const electronService = inject(ElectronService);

  return from(electronService.ipcRenderer.invoke('getAuthToken'))
    .pipe(
      filter((token) => !!token || (!token && request.url.includes('device'))),
      switchMap((token) => {
        return request.url.includes('device')
          ? next(request)
          : next(request.clone({
            headers: request.headers.set('Authorization', `Bearer ${token}`),
          }));
      }),
    );
};
