import { Injectable, signal } from '@angular/core';

@Injectable()
export class NewspaperMediaObjectService {
  public currentPostIndex = signal(0);
}
