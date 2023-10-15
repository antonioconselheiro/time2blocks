import { Time2BlocksFormat } from './format';
import { Time2BlocksHistoryLoader } from './history';

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
      this.historyService.cache[timestamp] = wrapper.block;
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
    let block = this.historyService.history[timestamp] || this.historyService.cache[timestamp];

    if (block) {
      return { block };
    } else if (this.historyService.lastBlock && timestamp >= Number(this.historyService.lastBlock.time)) {
      block = this.historyService.lastBlock.block;
      return { block };
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

    const blockKeys = [].concat(this.historyService.blockKeys);
    if (!isBeforeBlockIndexed) {
      const [blockIndexedBefore, blockIndexedAfter] = this.getIndexedBlocksAroundBlock(blockBefore, blockKeys);
      return { blockA: blockIndexedBefore, blockB: blockIndexedAfter };
    } else {
      const [blockIndexedBefore, blockIndexedAfter] = this.getIndexedBlocksAroundBlock(blockAfter, blockKeys);
      return { blockA: blockIndexedBefore, blockB: blockIndexedAfter };
    }
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
    const blockBefore = this.getIndexedBlocksAfterBlock(block, [].concat(blocks));
    const blockAfter = this.getIndexedBlocksBeforeBlock(block, [].concat(blocks));

    return [blockBefore, blockAfter];
  }

  private getIndexedBlocksAfterBlock(block: number, blocks: number[]): number {
    if (blocks.length === 1) {
      return blocks[0];
    }

    const middle = Math.ceil(blocks.length / 2);
    if (Number(blocks[middle]) <= block) {
      return this.getIndexedBlocksAfterBlock(block, blocks.splice(middle));
    } else {
      return this.getIndexedBlocksAfterBlock(block, blocks.splice(0, middle));
    }
  }

  private getIndexedBlocksBeforeBlock(block: number, blocks: number[]): number {
    if (blocks.length === 1) {
      return blocks[0];
    }

    const middle = Math.floor(blocks.length / 2);
    if (Number(blocks[middle]) < block) {
      return this.getIndexedBlocksBeforeBlock(block, blocks.splice(middle));
    } else {
      return this.getIndexedBlocksBeforeBlock(block, blocks.splice(0, middle));
    }
  }

  offline(): void {
    this.isOnline = false;
    this.historyService.offline();
  }
}
