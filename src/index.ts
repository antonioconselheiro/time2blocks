import { Time2BlocksFormat } from './format';
import { Time2BlocksHistoryLoader } from './history';

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

  private readonly historyService = Time2BlocksHistoryLoader.getInstance();
  private readonly formatService = Time2BlocksFormat.getInstance();

  constructor() { return Time2Blocks.getInstance(this); }

  getHistoryFromTimestamp(timestamp: number): number | null {
    const block = this.historyService.history[timestamp];

    if (block) {
      return block;
    } else {
      const timeKey = this.getTimeWithBlockIndexedFromTime(timestamp, Object.keys(this.historyService.history));
      return timeKey && this.historyService.history[timeKey] || null;
    }
  }

  format(block: number, format: string, numberSeparator = ','): string {
    return this.formatService.format(block, format, numberSeparator);
  }

  async getFromTimestamp(timestamp: number): Promise<number | null> {
    let block = this.getHistoryFromTimestamp(timestamp);
    if (block !== null) {
      return Promise.resolve(block);
    }

    const { start, end } = await this.historyService.getUpdateBlockNextToTimestamp(timestamp);
    block = this.getHistoryFromTimestamp(timestamp);
    if (block !== null) {
      return Promise.resolve(block);
    }

    await this.historyService.getUpdateBlockNextToTimestamp(timestamp, start, end);
    block = this.getHistoryFromTimestamp(timestamp);
    return Promise.resolve(block);
  }

  getFromMillisecondsTimestamp(timestamp: number): Promise<number | null> {
    return this.getFromTimestamp(timestamp / 1000);
  }

  private getTimeWithBlockIndexedFromTime(timestamp: number, times: string[]): number | null {
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

