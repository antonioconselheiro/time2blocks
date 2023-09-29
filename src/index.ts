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
    let wrapper = this.getBlockFromTimestamp(timestamp);
    if ('block' in wrapper) {
      return Promise.resolve(wrapper.block);
    }

    if (!this.isOnline) {
      return Promise.resolve(null);
    }

    const start = this.getBlockWithDateFromIndexedBlock(wrapper.blockA);
    const end = this.getBlockWithDateFromIndexedBlock(wrapper.blockB);

    await this.historyService.updateBlockNextToTimestamp(timestamp, start, end);
    wrapper = this.getBlockFromTimestamp(timestamp);
    if ('block' in wrapper) {
      return Promise.resolve(wrapper.block);
    }

    return this.loadFromTimestamp(timestamp);
  }

  private getBlockWithDateFromIndexedBlock(indexedBlock: number): {
    height: number;
    timestamp: string;
  } {
    const timestamp = this.historyService.historyBlockIndexed[indexedBlock];
    return { height: indexedBlock, timestamp };
  }

  getBlockFromTimestamp(timestamp: number): { block: number } | { blockA: number, blockB: number } {
    let block = this.historyService.history[timestamp];

    if (block) {
      return { block };
    } else if (this.historyService.lastBlock && timestamp >= Number(this.historyService.lastBlock.time)) {
      return { block: this.historyService.lastBlock.block };
    }

    const timestampKeys = this.historyService.timestampKeys;
    const timeKey = this.getTimeIndexedFromTime(timestamp, [].concat(timestampKeys));
    block = this.historyService.history[timeKey];

    const blockBefore = block - 1;
    const blockAfter = block + 1;

    const isBeforeBlockIndexed = !!this.historyService.historyBlockIndexed[blockBefore];
    const isAfterBlockIndexed =  !!this.historyService.historyBlockIndexed[blockAfter];

    if (isBeforeBlockIndexed && isAfterBlockIndexed) {
      return { block };
    }
    
    const blockKeys = this.historyService.blockKeys;
    const [blockIndexedBefore, blockIndexedAfter] = this.getIndexedBlocksAroundBlock(blockBefore, blockKeys);
    return { blockA: blockIndexedBefore, blockB: blockIndexedAfter };
  }

  format(block: number, format: string, numberSeparator = ','): string {
    return this.formatService.format(block, format, numberSeparator);
  }

  /// 🔥🔥🔥🔥🔥🔥
  private getTimeIndexedFromTime(timestamp: number, times: string[]): number {
    if (times.length === 1) {
      return Number(times[0]);
    }

    const middle = Math.floor(times.length / 2);
    if (Number(times[middle]) < timestamp) {
      return this.getTimeIndexedFromTime(timestamp, times.splice(middle));
    } else {
      return this.getTimeIndexedFromTime(timestamp, times.splice(0, middle));
    }
  }

  private getIndexedBlocksAroundBlock(block: number, blocks: number[]): [number, number] {
    if (blocks.length < 10) {
      return this.getBlocksAround(block, blocks);
    }

    const middle = Math.floor(blocks.length / 2);
    if (Number(blocks[middle]) < block) {
      return this.getIndexedBlocksAroundBlock(block, blocks.splice(middle));
    } else {
      return this.getIndexedBlocksAroundBlock(block, blocks.splice(0, middle));
    }
  }

  private getBlocksAround(block: number, blocks: number[]): [number, number] {
    console.info('block', block, 'blocks', blocks);
    const before = blocks.filter(minor => minor <= block);
    const after = blocks.filter(major => major > block);

    if (before.length && after.length) {
      return [
        before[before.length - 1], after[0]
      ];
    } else if (before.length) {
      return [
        before[before.length - 2],
        before[before.length - 1]
      ];
    } else {
      return [
        after[0], after[1]
      ];
    }

  }

  offline(): void {
    this.isOnline = false;
    this.historyService.offline();
  }
}
