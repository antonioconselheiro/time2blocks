import { Calc } from 'calc-js';
import { Time2BlocksFormat } from './format';
import { Time2BlocksHistoryLoader } from './history';
import { calcConfig } from './calc-config';

export * from './format';
export * from './history';
export * from './util';

export class Time2Blocks {

  private static instance: Time2Blocks | null = null;

  static getInstance(isOnline = true, newInstance?: Time2Blocks): Time2Blocks {
    if (!this.instance) {
      this.instance = newInstance || new Time2Blocks(isOnline);
    }

    return this.instance;
  }

  loading: Promise<number> | null = null;

  private readonly historyService!: Time2BlocksHistoryLoader;
  private readonly formatService = Time2BlocksFormat.getInstance();

  constructor(
    private isOnline: boolean
  ) {
    if (this.isOnline) {
      this.historyService = Time2BlocksHistoryLoader.getInstance();
    } else {
      this.historyService = Time2BlocksHistoryLoader.getInstance(false);
      this.historyService.offline();
    }

    return Time2Blocks.getInstance(isOnline, this);
  }

  async getFromTimestamp(timestamp: number): Promise<number | null> {
    // macgyverism
    if (this.loading) {
      const loading = this.loading;
      const newLoading = this.loading = new Promise<number | null>(resolve => {
        loading.then(() => {
          return this.loadFromTimestamp(timestamp).then((v) => {
            if (newLoading === this.loading) {
              this.loading = null;
            }

            resolve(v);
            return Promise.resolve(v);
          });
        });
      });

      return newLoading;
    }

    const newLoading = this.loading = this.loadFromTimestamp(timestamp);
    this.loading.then((v) => {
      if (newLoading === this.loading) {
        this.loading = null;
      }

      return Promise.resolve(v);
    });
    return newLoading;
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
    //await Promise.all([].concat(this.loading));
    let wrapper = this.getHistoryFromTimestamp(timestamp);
    if ('block' in wrapper) {
      return Promise.resolve(wrapper.block);
    }

    if (!this.isOnline) {
      return Promise.resolve(null);
    }

    await this.historyService.updateBlockNextToTimestamp(timestamp);
    wrapper = this.getHistoryFromTimestamp(timestamp);
    if ('block' in wrapper) {
      return Promise.resolve(wrapper.block);
    }

    return this.loadFromTimestamp(timestamp);
  }

  getHistoryFromTimestamp(timestamp: number): { block: number } | { blockA: number, blockB: number } {
    let block = this.historyService.history[timestamp];

    const timestampKeys = this.historyService.timestampKeys;
    const blockKeys = this.historyService.blockKeys;

    if (!block) {
      const timeKey = this.getTimeWithBlockIndexedFromTime(timestamp, [].concat(timestampKeys));
      block = this.historyService.history[timeKey];
    }

    const blockBefore = block - 1;
    const blockAfter = block + 1;

    const isBeforeBlockIndexed = this.isBlockIndexed(blockBefore, blockKeys);
    const isAfterBlockIndexed = this.isBlockIndexed(blockAfter, blockKeys);

    const lastBlock = this.historyService.lastBlock;

    if (isBeforeBlockIndexed.indexed && isAfterBlockIndexed.indexed) {
      return { block };
    } else if (!isBeforeBlockIndexed.indexed) {
      return { blockA: isBeforeBlockIndexed.block, blockB: block };
    } else if (!isAfterBlockIndexed.indexed) {
      return { blockA: block, blockB: isAfterBlockIndexed.block };
    } else if (lastBlock) {
      return { blockA: block, blockB: lastBlock.block };
    }
  }

  format(block: number, format: string, numberSeparator = ','): string {
    return this.formatService.format(block, format, numberSeparator);
  }

  /// 🔥🔥🔥🔥🔥🔥
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

  private isBlockIndexed(block: number, blocks: number[]): { indexed: boolean, block: number } {
    if (blocks.length === 1) {
      return { indexed: blocks[0] === block, block };
    }

    const middle = Math.floor(blocks.length / 2);
    if (Number(blocks[middle]) < block) {
      return this.isBlockIndexed(block, blocks.splice(middle));
    } else {
      return this.isBlockIndexed(block, blocks.splice(0, middle));
    }
  }

  offline(): void {
    this.isOnline = false;
    this.historyService.offline();
  }
}
