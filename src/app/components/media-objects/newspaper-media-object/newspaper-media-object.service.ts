import { Injectable, signal } from '@angular/core';

import { Player } from '$types/player.types';

@Injectable()
export class NewspaperMediaObjectService {
  public currentPostIndex = signal(0);
  public player = signal<Player | null>(null);
  public newspaperBroadcast: Record<string, any> = {};
}
