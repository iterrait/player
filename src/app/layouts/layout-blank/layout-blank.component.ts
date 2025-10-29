import {
    ChangeDetectionStrategy,
    Component,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'layout-blank',
  standalone: true,
  imports:[
    RouterOutlet,
  ],
  templateUrl: './layout-blank.component.html',
  styleUrls: ['./layout-blank.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutBlankComponent {}
