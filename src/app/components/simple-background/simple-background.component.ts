import {
  ChangeDetectionStrategy,
  Component,
  input,
} from '@angular/core';

import { NewspaperMediaObjectParams } from '$types/media-objects.types';

@Component({
  selector: 'simple-background',
  standalone: true,
  imports: [],
  templateUrl: './simple-background.component.html',
  styleUrls: ['./simple-background.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimpleBackgroundComponent {
  public params = input.required<NewspaperMediaObjectParams>();
  public localBasePath = input.required<string>();
}
