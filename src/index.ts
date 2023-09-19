import { Calc } from 'calc-js';
import { Time2BlocksFormat } from './format';
import { Time2BlocksHistoryLoader } from './history';
import { calcConfig } from './calc-config';

export * from './format';
export * from './history';
export * from './util';

export class Time2Blocks {

  private static instance: Time2Blocks | null = null;

  static getInstance(newInstance?: Time2Blocks): Time2Blocks {
    if (!this.instance) {
      this.instance = newInstance || new Time2Blocks();
    }

    return this.instance;
  }

  loading: Array<Promise<any>> = [];

  private readonly historyService = Time2BlocksHistoryLoader.getInstance();
  private readonly formatService = Time2BlocksFormat.getInstance();

  constructor() { return Time2Blocks.getInstance(this); }

  async getFromTimestamp(timestamp: number): Promise<number | null> {
    const promise = this.loadFromTimestamp(timestamp);
    this.loading.push(promise);
    return promise;
  }

  getFromMillisecondsTimestamp(timestamp: number): Promise<number | null> {
    const millisecondInSecond = 1000;
    return this.getFromTimestamp(
      new Calc(timestamp, calcConfig)
        .divide(millisecondInSecond)
        .pipe(v => Math.floor(v))
        .finish()
    );
  }

  getFromMinutes(timestampInMinutes: number): Promise<number | null> {
    const secondsInMinute = 60;
    return this.getFromTimestamp(
      new Calc(timestampInMinutes, calcConfig)
        .multiply(secondsInMinute)
        .finish()
    );
  }

  private async loadFromTimestamp(timestamp: number): Promise<number | null>  {
    await Promise.all([].concat(this.loading));
    let block = this.getHistoryFromTimestamp(timestamp);
    if (block !== null) {
      return Promise.resolve(block);
    }

    const { start: start1, end: end1 } = await this.historyService.getUpdateBlockNextToTimestamp(timestamp);
    block = this.getHistoryFromTimestamp(timestamp);
    if (block !== null) {
      return Promise.resolve(block);
    }

    const { start: start2, end: end2 } = await this.historyService.getUpdateBlockNextToTimestamp(timestamp, start1, end1);
    block = this.getHistoryFromTimestamp(timestamp);
    if (block !== null) {
      return Promise.resolve(block);
    }

    await this.historyService.getUpdateBlockNextToTimestamp(timestamp, start2, end2);
    block = this.getHistoryFromTimestamp(timestamp);
    return Promise.resolve(block);
  }

  getHistoryFromTimestamp(timestamp: number): number | null {
    const block = this.historyService.history[timestamp];

    if (block) {
      return block;
    } else {
      const timeKey = this.getTimeWithBlockIndexedFromTime(timestamp, Object.keys(this.historyService.history));
      const isValid = this.isValidTimeKey(timestamp, timeKey);

      if (isValid) {
        return this.historyService.history[timeKey];
      }
    }

    return null;
  }

  private isValidTimeKey(timestamp: number, timeKey: number): boolean {
    const timeDifference = new Calc(timestamp, calcConfig)
      .minus(timeKey)
      .pipe(v => Math.sqrt(Math.pow(v, 2)))
      .finish();

    const secondsInMinute = 60;
    const maxRangeMin = 19;
    const maxRange = new Calc(secondsInMinute, calcConfig)
      .multiply(maxRangeMin)
      .finish();

    if (timeDifference > maxRange) {
      return false;
    }

    return true;
  }

  format(block: number, format: string, numberSeparator = ','): string {
    return this.formatService.format(block, format, numberSeparator);
  }

  private getTimeWithBlockIndexedFromTime(timestamp: number, times: string[]): number {
    if (times.length === 1) {
      return Number(times[0]);
    }

    const middle = Math.floor(times.length / 2);
    if (Number(times[middle]) < timestamp) {
      return this.getTimeWithBlockIndexedFromTime(timestamp, times.splice(middle));
    } else {
      return this.getTimeWithBlockIndexedFromTime(timestamp, times.splice(0, middle));
    }
  }
}

export const time2Blocks = new Time2Blocks();

