import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  public domain = signal('iterra.world');
  public projectSysname = signal('iterra');
}
