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
      //  if the timestamp is the exact one indexed
      return { block };
    } else if (this.historyService.lastBlock && timestamp >= Number(this.historyService.lastBlock.time)) {
      //  if timestamp is major than the last block creation time
      block = this.historyService.lastBlock.block;
      return { block };
    } else if (Number(this.historyService.firstBlock.time) > timestamp) {
      //  if timestamp is minor than the first block creation time
      block = this.historyService.firstBlock.block;
      return { block };
    }

    const timestampKeys = this.historyService.timestampKeys;
    const timeKey = this.getTimeIndexedFromTime(timestamp, [].concat(timestampKeys));
    block = this.historyService.history[timeKey];

    const blockBefore = block - 1;
    const blockAfter = block + 1;

    const isBeforeBlockIndexed = !!this.historyService.historyBlockIndexed[blockBefore];
    const isAfterBlockIndexed =  !!this.historyService.historyBlockIndexed[blockAfter];

    //  if there are blocks around this will be surelly the block related to the timestamp,
    //  otherwise would be need to load the data around the given references
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

  /**
   * using the timestamp passed by parameter, it searches the indexed timestamps,
   * those with the associated block number, and then delivers the timestamp
   * closest to the parameter that is indexed
   *
   * @param timestamp reference
   * @param times array with all indexed timestamp
   *
   * @returns indexed timestamp closest to the timestamp parameter
   */
  private getTimeIndexedFromTime(timestamp: number, times: string[]): number {
    if (times.length === 1) {
      return Number(times[0]);
    }

    const middle = Math.floor(times.length / 2);
    const timesClone = [].concat(times);
    const blocksBefore = timesClone.splice(0, middle);
    const blocksAfter = timesClone;

    const majorTimeFromBeforeList = blocksBefore[blocksBefore.length -1];
    const minorTimeFromAfterList = blocksAfter[0];

    if (majorTimeFromBeforeList < timestamp && timestamp < minorTimeFromAfterList) {
      return minorTimeFromAfterList;
    } else if (Number(times[middle]) < timestamp) {
      return this.getTimeIndexedFromTime(timestamp, blocksAfter);
    } else {
      return this.getTimeIndexedFromTime(timestamp, blocksBefore);
    }
  }

  private getIndexedBlocksAroundBlock(requestedBlock: number, blocks: number[]): [number, number] {
    if (blocks.length === 1) {
      return [blocks[0], blocks[0]];
    }

    const blocksClone = [].concat(blocks);
    const middle = Math.floor(blocks.length / 2);
    const blocksBeforeMiddle = blocksClone.splice(0, middle);
    const blocksAfterMiddle = blocksClone;
    const blockInMiddle = Number(blocks[middle]);

    const majorBlockFromBeforeBlocks = blocksBeforeMiddle[blocksBeforeMiddle.length -1];
    const minorBlockFromAfterBlocks = blocksAfterMiddle[0];

    if (majorBlockFromBeforeBlocks < requestedBlock && requestedBlock < minorBlockFromAfterBlocks) {
      return [majorBlockFromBeforeBlocks, minorBlockFromAfterBlocks];
    } else if (requestedBlock < blockInMiddle) {
      return this.getIndexedBlocksAroundBlock(requestedBlock, blocksBeforeMiddle);
    } else {
      return this.getIndexedBlocksAroundBlock(requestedBlock, blocksAfterMiddle);
    }
  }

  offline(): void {
    this.isOnline = false;
    this.historyService.offline();
  }
}
