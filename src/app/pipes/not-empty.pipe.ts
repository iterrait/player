import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'notEmpty',
  standalone: true,
})
export class NotEmptyPipe implements PipeTransform {
  public transform(value: string | number | null | undefined, includeZero = false): string {
    if (value === '' || value === null || value === 'null' || value === undefined) return '—';

    if (includeZero && /^0+(?:[,.]0+$)/.test(String(value))) return '—';

    return String(value);
  }
}
