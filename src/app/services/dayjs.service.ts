import { Injectable } from '@angular/core';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import isBetween from 'dayjs/plugin/isBetween';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';

@Injectable({ providedIn: 'root' })
export class DayjsService {
  constructor() {
    // Инициализация плагинов
    dayjs.locale('ru');
    dayjs.extend(customParseFormat);
    dayjs.extend(isBetween);
    dayjs.extend(isSameOrBefore);
    dayjs.extend(isSameOrAfter);
    dayjs.extend(duration);
    dayjs.extend(relativeTime);
  }

  /**
   * Создание dayjs объекта
   */
  create(date?: dayjs.ConfigType): dayjs.Dayjs {
    return dayjs(date);
  }

  /**
   * Текущая дата
   */
  now(): dayjs.Dayjs {
    return dayjs();
  }

  /**
   * Форматирование даты
   */
  format(date: dayjs.ConfigType, format: string = 'DD.MM.YYYY'): string {
    return dayjs(date).format(format);
  }

  /**
   * Парсинг строки в dayjs
   */
  parse(dateString: string, format: string = 'DD.MM.YYYY'): dayjs.Dayjs | null {
    const parsed = dayjs(dateString, format);
    return parsed.isValid() ? parsed : null;
  }

  /**
   * Проверка валидности даты
   */
  isValid(date: dayjs.ConfigType): boolean {
    return dayjs(date).isValid();
  }

  /**
   * Разница между датами
   */
  diff(start: dayjs.ConfigType, end: dayjs.ConfigType, unit: dayjs.QUnitType = 'day'): number {
    return dayjs(end).diff(dayjs(start), unit);
  }

  /**
   * Добавление времени
   */
  add(date: dayjs.ConfigType, value: number, unit: dayjs.ManipulateType): dayjs.Dayjs {
    return dayjs(date).add(value, unit);
  }

  /**
   * Вычитание времени
   */
  subtract(date: dayjs.ConfigType, value: number, unit: dayjs.ManipulateType): dayjs.Dayjs {
    return dayjs(date).subtract(value, unit);
  }

  /**
   * Начало периода (день, месяц, год)
   */
  startOf(date: dayjs.ConfigType, unit: dayjs.OpUnitType): dayjs.Dayjs {
    return dayjs(date).startOf(unit);
  }

  /**
   * Конец периода
   */
  endOf(date: dayjs.ConfigType, unit: dayjs.OpUnitType): dayjs.Dayjs {
    return dayjs(date).endOf(unit);
  }

  /**
   * Проверка находится ли дата между двумя датами
   */
  isBetween(date: dayjs.ConfigType, start: dayjs.ConfigType, end: dayjs.ConfigType): boolean {
    return dayjs(date).isBetween(start, end);
  }

  /**
   * Относительное время (2 дня назад, через 3 часа)
   */
  fromNow(date: dayjs.ConfigType): string {
    return dayjs(date).fromNow();
  }

  /**
   * Длительность
   */
  duration(milliseconds: number): string {
    return dayjs.duration(milliseconds).humanize();
  }

  /**
   * Получение списка дат в диапазоне
   */
  getDatesInRange(start: dayjs.ConfigType, end: dayjs.ConfigType): dayjs.Dayjs[] {
    const startDate = dayjs(start);
    const endDate = dayjs(end);
    const dates: dayjs.Dayjs[] = [];

    let current = startDate;
    while (current.isSameOrBefore(endDate, 'day')) {
      dates.push(current);
      current = current.add(1, 'day');
    }

    return dates;
  }

  /**
   * Рабочие дни (без выходных)
   */
  isWorkDay(date: dayjs.ConfigType): boolean {
    const day = dayjs(date).day();
    return day !== 0 && day !== 6; // не воскресенье и не суббота
  }

  /**
   * Конвертация в JavaScript Date
   */
  toDate(date: dayjs.ConfigType): Date {
    return dayjs(date).toDate();
  }

  /**
   * Конвертация из JavaScript Date
   */
  fromDate(date: Date): dayjs.Dayjs {
    return dayjs(date);
  }
}
