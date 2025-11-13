import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  output,
  QueryList,
  signal,
  viewChildren
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { ToastrService } from 'ngx-toastr';
import { finalize, from, switchMap } from 'rxjs';

import { BaseComponent } from '@iterra/app-lib/directives';
import { ItButtonModule } from '@iterra/app-lib/it-button';
import { ItInputModule } from '@iterra/app-lib/it-input';

import { PlayerApiService } from '$services/api/player.api.service';
import { ElectronService } from '$services/electron.service';

@Component({
  selector: 'cloud-connection',
  standalone: true,
  imports: [
    ItButtonModule,
    ItInputModule,
    ReactiveFormsModule,
  ],
  templateUrl: './cloud-connection.component.html',
  styleUrls: ['./cloud-connection.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CloudConnectionComponent extends BaseComponent {
  public deviceLinked = output();

  protected inputsList = viewChildren<QueryList<ElementRef>>('codeInput');

  private electronService = inject(ElectronService);
  private playerApiService = inject(PlayerApiService);
  private toastrService = inject(ToastrService);

  protected inputCounts = 6;
  protected isLoading = signal(false);
  protected enteredValues: string [] = [];

  protected get checkAccessSubmit(): boolean {
    this.enteredValues = this.inputsList()
      // @ts-expect-error TODO
      .map((item) => item.nativeElement.value)
      .filter((item) => !!item);

    return this.enteredValues.length === this.inputCounts;
  }

  protected onPaste(event: ClipboardEvent, i: number): void {
    event.preventDefault();
    event.stopPropagation();

    const data = event.clipboardData ? event.clipboardData.getData('text').trim() : '';

    if (this.isEmpty(data)) {
      return;
    }

    this.setInputValues(data!.split(''), 0);

    // @ts-expect-error TODO
    this.inputsList()[i].nativeElement.blur();
  }

  protected onInput(event: Event, item: number): void {
    const target = event.target;

    // @ts-expect-error TODO
    if (!event.data && !target.value) {
      return;
    }

    // @ts-expect-error TODO
    const value = event.data || target.value;

    if (this.isEmpty(value)) {
      return;
    }

    const values = value.toString().trim().split('');

    for (let j = 0; j < values.length; j++) {
      const index = j + item;
      if (index > this.inputCounts - 1) {
        break;
      }
    }

    const next = item + values.length;
    if (next > this.inputCounts - 1) {
      // @ts-expect-error TODO
      target?.blur();
      return;
    }

    // @ts-expect-error TODO
    this.inputsList()[next].nativeElement.focus();
  }

  protected onSubmitClick(): void {
    if (this.enteredValues.length !== this.inputCounts) {
      return;
    }

    this.isLoading.set(true);
    const code = this.enteredValues.join('');

    from(this.electronService.ipcRenderer.invoke('getAuthToken'))
      .pipe(
        switchMap((token) => this.playerApiService.linkPLayer(code, token)),
        finalize(() => this.isLoading.set(false)),
        this.takeUntilDestroy(),
      )
      .subscribe({
        next: (player) => {
          this.setInputValues([], 0);
          this.electronService.ipcRenderer.send(
            'setPlayerDataWithReload',
            { ...player, isPlayerLinked: true },
          );
          this.deviceLinked.emit();
          this.toastrService.success('Плеер успешно привязан');
        },
        error: (error: ErrorEvent) => {
          this.toastrService.error(error.error.detail ?? 'Ошибка привязки плеера');
        },
      });
  }

  private isEmpty(value: string): boolean {
    return !value.toString().length;
  }

  private setInputValues(values: string[], index = 0): void {
    for (let j = index; j < this.inputsList().length; j++) {
      if (j === this.inputsList().length) {
        break;
      }
      // @ts-expect-error TODO
      this.inputsList()[j].nativeElement.value = values[j] || '';
    }
  }
}
