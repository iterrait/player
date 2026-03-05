import { Injectable, isDevMode, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  public domain = signal(`iterra.${isDevMode() ? 'space' : 'world'}`);
  public projectSysname = signal('iterra');
}
