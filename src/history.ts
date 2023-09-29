import { Calc } from 'calc-js';
import { calcConfig } from './calc-config';
import { WebSocket as WebSocketNode } from 'ws';
import { baseHistory } from './base-history';

export type TBlockchainTimeHistory = {
  [time: string]: number
};

export type TBlockchainBlocksHistory = {
  [block: string]: string
};

export class Time2BlocksHistoryLoader {
  private static instance: Time2BlocksHistoryLoader | null = null;

  static getInstance(isOnline = true, newInstance?: Time2BlocksHistoryLoader): Time2BlocksHistoryLoader {
    if (!this.instance) {
      this.instance = newInstance || new Time2BlocksHistoryLoader(isOnline);

      this.instance.updateHistoryIndex();
      if (isOnline) {
        this.instance.update().then(() => this.instance.listenMempool());
      }
    }

    return this.instance;
  }

  //  starts with a basic historic for reference
  // 🔥🔥🔥🔥🔥🔥🔥
  history: TBlockchainTimeHistory = baseHistory;
  cache: TBlockchainTimeHistory = {};

  historyBlockIndexed!: TBlockchainBlocksHistory;
  timestampKeys!: string[];
  blockKeys!: number[];

  private readonly mempoolApi = 'https://mempool.space/api/';

  private mempoolConn: Time2BlockMempoolConn | null = null;
  lastBlock: { block: number, time: string } | null = null;

  listening = false;
  updating: Promise<void>[] = [];

  constructor(
    private isOnline = true
  ) {
    return Time2BlocksHistoryLoader.getInstance(isOnline, this);
  }

  setIndex(history: TBlockchainTimeHistory): void {
    this.history = history;
    this.updateHistoryIndex();
  }

  updateIndex(history: TBlockchainTimeHistory): void {
    this.history = { ...this.history, ...history };
    this.updateHistoryIndex();
  }

  addBlock(block: number, time: string): void {
    if (!this.lastBlock || block > this.lastBlock.block) {
      this.lastBlock = { block, time };
    }
    this.history[time] = block;
    this.updateHistoryIndex();
  }

  async loadIndex(path?: string): Promise<void> {
    const response = await fetch(path || './history.json');
    this.history = await response.json();
    this.updateHistoryIndex();
    return Promise.resolve();
  }

  listenMempool(): void {
    this.listening = true;
    this.mempoolConn = new Time2BlockMempoolConn();
    this.mempoolConn.onBlock(block => this.addBlock(block.height, block.timestamp))
  }

  listen(): void {
    this.listening = true;

    if (this.mempoolConn) {
      this.mempoolConn.connect();
    }
  }

  stopListen(): void {
    this.listening = false;

    if (this.mempoolConn) {
      this.mempoolConn.close();
    }
  }

  async updateBlockNextToTimestamp(
    timestamp: number,
    start: { height: number, timestamp: string },
    end: { height: number, timestamp: string }
  ): Promise<void> {
    const baseHeight = this.getEstimatedBlockFromTimestamp(timestamp, start, end);
    
    if (this.lastBlock && baseHeight === this.lastBlock.block) {
      return Promise.resolve();
    }

    const response = await fetch(`${this.mempoolApi}v1/blocks/${baseHeight}`);
    const blocksList: Array<{ height: string, timestamp: string }> = await response.json();

    blocksList.forEach(({ height, timestamp }) => this.history[timestamp] = Number(height));
    this.updateHistoryIndex();
  }

  private async update(): Promise<void> {
    if (!this.isOnline) {
      return Promise.resolve();
    }

    const response = await fetch(`${this.mempoolApi}v1/blocks/`);
    const updaten = await response.json();
    updaten.forEach(block => this.addBlock(block.height, block.timestamp));

    return Promise.resolve();
  }

  async loadBlock(height: number): Promise<{ height: number, timestamp: string }> {
    const responseHash = await fetch(`${this.mempoolApi}block-height/${height}`);
    const hash = await responseHash.json();
    const responseBlock = await fetch(`${this.mempoolApi}block/${hash}`);
    const timestamp = await responseBlock.json();

    const metadata = { height, timestamp: String(timestamp) };
    this.history[metadata.timestamp] = metadata.height;
    this.updateHistoryIndex();
    return Promise.resolve(metadata);
  }

  updateHistoryIndex(): void {
    this.timestampKeys = Object.keys(this.history).sort((a, b) => Number(a) - Number(b));
    this.blockKeys = Object.values(this.history).sort((a, b) => a - b);
    this.historyBlockIndexed = Object.fromEntries(Object.entries(this.history).map(([chave, valor]) => [valor, chave]));
  }

  getEstimatedBlockFromTimestamp(
    timestamp: number,
    start: { height: number, timestamp: string },
    end: { height: number, timestamp: string }
  ): number {
    const blocksDifference = new Calc(end.height, calcConfig).minus(start.height).finish();
    const timeDifference = new Calc(Number(end.timestamp), calcConfig)
      .minus(Number(start.timestamp))
      .finish();

    const estimatedTimeForEachBlock = new Calc(timeDifference, calcConfig)
      .divide(blocksDifference)
      .finish();

    const timeDifferenceBetweenReferenceAndArg = new Calc(timestamp, calcConfig)
      .minus(Number(start.timestamp))
      .finish();

    const estimatedBlocksFromStartReference = new Calc(timeDifferenceBetweenReferenceAndArg, calcConfig)
      .divide(estimatedTimeForEachBlock)
      .pipe(v => Math.floor(v))
      .finish();

    const estimatedBlock = new Calc(start.height, calcConfig).sum(estimatedBlocksFromStartReference).finish();
    if (estimatedBlock <= 1) {
      return 1;
    } else if (this.lastBlock && estimatedBlock >= this.lastBlock.block) {
      return this.lastBlock.block;
    }

    console.info(
      'timestamp: ', timestamp,
      'start: ', start,
      'end: ', end,
      'blocksDifference: ', blocksDifference,
      'timeDifference: ', timeDifference,
      'estimatedTimeForEachBlock: ', estimatedTimeForEachBlock,
      'timeDifferenceBetweenReferenceAndArg: ', timeDifferenceBetweenReferenceAndArg,
      'estimatedBlocksFromStartReference: ', estimatedBlocksFromStartReference,
      'estimatedBlock: ', estimatedBlock
    );
    return estimatedBlock;
  }

  offline(): void {
    this.isOnline = false;
  }
}

export class WebSocketFacade {

  private readonly hasWindow = typeof window !== 'undefined';

  clientWeb?: WebSocket;
  clientNode?: WebSocketNode;

  constructor(conn: string) { 
    this.init(conn);
  }

  private init(conn: string): void {
    if (this.hasWindow) {
      this.clientWeb = new (window.WebSocket || window['MozWebSocket'])(conn);
    } else {
      this.clientNode = new WebSocketNode(conn);
    }
  }

  onOpen(calle: () => void) {
    if (this.clientWeb) {
      this.clientWeb.onopen = calle;
    } else if (this.clientNode) {
      this.clientNode.on('open', calle);
    }
  }

  onError(calle: (error?: unknown) => void) {
    if (this.clientWeb) {
      this.clientWeb.onerror = calle;
    } else if (this.clientNode) {
      this.clientNode.on('error', calle);
    }
  }

  onMessage(calle: (message?: string) => void) {
    if (this.clientWeb) {
      this.clientWeb.onmessage = (ev: MessageEvent<any>) => calle(JSON.parse(ev.data));
    } else if (this.clientNode) {
      this.clientNode.on('message', (message: string) => calle(JSON.parse(message)));
    }
  }

  onClose(calle: () => void) {
    if (this.clientWeb) {
      this.clientWeb.onclose = calle;
    } else if (this.clientNode) {
      this.clientNode.on('close', calle);
    }
  }

  close(): void {
    if (this.clientWeb) {
      this.clientWeb.close();
    } else if (this.clientNode) {
      this.clientNode.close();
    }
  }

  send(serialized: string): void {
    if (this.clientWeb) {
      this.clientWeb.send(serialized);
    } else if (this.clientNode) {
      this.clientNode.send(serialized);
    }
  }
}

export abstract class Time2BlockConnection {
  private subscriptions = [];

  onBlock(sub: (block: { height: number, timestamp: string }) => void) {
    this.subscriptions.push(sub);
  }

  emit(block: { height: number, time: string }): void {
    this.subscriptions.forEach(calle => calle(block));
  }

  abstract connect(): void;
  abstract close(): void;
}

export class Time2BlockMempoolConn extends Time2BlockConnection {

  protected readonly link = 'wss://mempool.space/api/v1/ws';

  protected client?: WebSocketFacade;

  constructor() {
    super();
    this.connect();
    this.client.onOpen(() => this.onConnect());
  }

  connect(): void {
    this.client = new WebSocketFacade(this.link);
  }

  protected onConnect(): void {
    this.client.onClose(() => this.onClose());
    this.client.onMessage(packet => {
      if (typeof packet === 'string') {
        packet = JSON.parse(packet);
      }

      this.onMessage(packet);
    });
    this.client.onError(err => console.error('error', err));

    this.blockSubscribe();
  }

  protected blockSubscribe(): void {
    this.client.send(JSON.stringify({ "action": "init" }));
    this.client.send(JSON.stringify({ "action": "want", "data": ['blocks'] }));
  }

  protected onMessage(res: any): void {
    console.info('mempool packet', res );
    if (res.block) {
      const { height, timestamp } = res.block;
      this.emit({ height, time: String(timestamp) });
    } else if (res.blocks) {
      res.blocks.forEach(block => {
        const { height, timestamp } = block;
        this.emit({ height, time: String(timestamp) });
      });
    }
  }

  close(): void {
    if (this.client) {
      this.client.close();
    }
  }

  private onClose(): void {
    this.client = null;
  }
}
