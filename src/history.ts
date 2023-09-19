import { Calc } from 'calc-js';
import { calcConfig } from './calc-config';
import { WebSocket as WebSocketNode } from 'ws';

export type TBlockchainTimeHistory = {
  [time: string]: number
};

export class Time2BlocksHistoryLoader {
  private static instance: Time2BlocksHistoryLoader | null = null;

  static getInstance(isOnline = true, newInstance?: Time2BlocksHistoryLoader): Time2BlocksHistoryLoader {
    if (!this.instance) {
      this.instance = newInstance || new Time2BlocksHistoryLoader(isOnline);

      if (isOnline) {
        this.instance.update().then(() => this.instance.listenMempool());
      }
    }

    return this.instance;
  }

  //  starts with a basic historic for reference
  // 🔥🔥🔥🔥🔥🔥🔥
  history: TBlockchainTimeHistory = {"1694628304":807500,"1694629434":807501,"1694629923":807502,"1694630354":807503,"1694631328":807504,"1694631354":807505,"1694631939":807506,"1694632075":807507,"1694632220":807508,"1694632597":807509,"1694632671":807510,"1694633045":807511,"1694633573":807512,"1694633935":807513,"1694634127":807514,"1694634714":807515,"1694634786":807516,"1694635076":807517,"1694635548":807518,"1694635568":807519,"1694635589":807520,"1694637204":807521,"1694638174":807522,"1694638351":807523,"1694638785":807524,"1694638849":807525,"1694638991":807526,"1694640340":807527,"1694641538":807528,"1694642418":807529,"1694642551":807530,"1694642574":807531,"1694642917":807532,"1694642973":807533,"1694643377":807534,"1694644529":807535,"1694644570":807536,"1694645231":807537,"1694646859":807538,"1694647558":807539,"1694647807":807540,"1694647856":807541,"1694648211":807542,"1694648684":807543,"1694649462":807544,"1694650774":807545,"1694651781":807546,"1694652088":807547,"1694652291":807548,"1694655059":807549,"1694657376":807550,"1694657836":807551,"1694658423":807552,"1694658714":807553,"1694659484":807554,"1694659607":807555,"1694660157":807556,"1694660373":807557,"1694661287":807558,"1694661374":807559,"1694662425":807560,"1694663125":807561,"1694663514":807562,"1694664240":807563,"1694664752":807564,"1694665543":807565,"1694665603":807566,"1694665785":807567,"1694665855":807568,"1694665886":807569,"1694666482":807570,"1694667073":807571,"1694667157":807572,"1694667684":807573,"1694667781":807574,"1694668171":807575,"1694668249":807576,"1694668404":807577,"1694668620":807578,"1694670538":807579,"1694670656":807580,"1694670807":807581,"1694671211":807582,"1694671782":807583,"1694672956":807584,"1694673045":807585,"1694673629":807586,"1694673724":807587,"1694673803":807588,"1694674180":807589,"1694674422":807590,"1694674614":807591,"1694674640":807592,"1694676198":807593,"1694676604":807594,"1694677006":807595,"1694677529":807596,"1694678289":807597,"1694679447":807598,"1694679742":807599,"1694680557":807600,"1694680820":807601,"1694680960":807602,"1694681054":807603,"1694681157":807604,"1694682165":807605,"1694682807":807606,"1694683001":807607,"1694683064":807608,"1694684425":807609,"1694687806":807610,"1694687935":807611,"1694689283":807612,"1694690134":807613,"1694690667":807614,"1694690783":807615,"1694691164":807616,"1694691275":807617,"1694691733":807618,"1694692419":807619};

  private readonly mempoolApi = 'https://mempool.space/api/';

  private mempoolConn: Time2BlockMempoolConn | null = null;
  private lastBlock: { block: number, time: string } | null = null;

  listening = false;
  updating: Promise<void>[] = [];

  constructor(
    private isOnline = true
  ) {
    return Time2BlocksHistoryLoader.getInstance(isOnline, this);
  }

  setIndex(history: TBlockchainTimeHistory): void {
    this.history = history;
  }

  updateIndex(history: TBlockchainTimeHistory): void {
    this.history = { ...this.history, ...history };
  }

  addBlock(block: number, time: string): void {
    if (!this.lastBlock || block > this.lastBlock.block) {
      this.lastBlock = { block, time };
    }
    this.history[time] = block;
  }

  async loadIndex(path?: string): Promise<void> {
    const response = await fetch(path || './history.json');
    this.history = await response.json();
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

  async getUpdateBlockNextToTimestamp(
    timestamp: number,
    start?: { height: number, timestamp: string },
    end?: { height: number, timestamp: string }
  ): Promise<{
    start?: { height: number, timestamp: string },
    end?: { height: number, timestamp: string }
  }> {
    const baseHeight = this.getEstimatedBlockFromTimestamp(timestamp, start, end);
    const response = await fetch(`${this.mempoolApi}v1/blocks/${baseHeight}`);
    const blocksList: Array<{ height: string, timestamp: string }> = await response.json();

    blocksList.forEach(({ height, timestamp }) => this.history[timestamp] = Number(height));

    const lastBlock = blocksList.length - 1;

    const resultStart = {
      height: Number(blocksList[0].height),
      timestamp: blocksList[0].timestamp
    };

    const resultEnd = {
      height: Number(blocksList[lastBlock].height),
      timestamp: blocksList[lastBlock].timestamp
    };

    return Promise.resolve({
      start: resultStart,
      end: resultEnd
    });
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
    return Promise.resolve(metadata);
  }

  getEstimatedBlockFromTimestamp(
    timestamp: number,
    start?: { height: number, timestamp: string },
    end?: { height: number, timestamp: string }
  ): number {
    if (!start || !end) {
      let historyAsKeys: string[] | null = Object.keys(this.history);
      const startTimestamp = historyAsKeys[historyAsKeys.length - 20]; // 1694680557
      const endTimestamp = historyAsKeys[historyAsKeys.length - 1]; // 1694692419

      historyAsKeys = null;

      const startHeight = this.history[startTimestamp];
      const endHeight = this.history[endTimestamp];

      start = { height: startHeight, timestamp: startTimestamp };
      end = { height: endHeight, timestamp: endTimestamp };
    }

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
    this.client.onMessage(packet => this.onMessage(packet));
    this.client.onError(err => console.error('error', err));

    this.blockSubscribe();
  }

  protected blockSubscribe(): void {
    this.client.send(JSON.stringify({ "action": "init" }));
    this.client.send(JSON.stringify({ "action": "want", "data": ['blocks'] }));
  }

  protected onMessage(packet: any): void {
    console.info('mempool packet', packet );
    const res = JSON.parse(packet.toString());
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
