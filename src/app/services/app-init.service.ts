import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AppInitService {
  public initApp(): Observable<Boolean | void> {
    return of(void 0);
  }
}
