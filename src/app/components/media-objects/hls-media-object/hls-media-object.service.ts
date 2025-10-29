import { Injectable } from '@angular/core';
import Hls from 'hls.js';
import { BehaviorSubject } from 'rxjs';

@Injectable()
export class HlsMediaObjectService {
  private hlsObjectsSource = new BehaviorSubject<Record<string, Hls>>({});

  public get hlsObjects(): Record<string, Hls> {
    return this.hlsObjectsSource.value;
  }

  public addHlsObject(source: string, object: Hls): void {
    const values = this.hlsObjectsSource.value;

    values[source] = object;
    this.hlsObjectsSource.next(values);
  }
}
