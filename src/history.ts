import { Calc } from 'calc-js';
var websocket = require('websocket');

export type TBlockchainTimeHistory = {
  [time: string]: number
};

export class Time2BlocksHistoryLoader {
  private static instance: Time2BlocksHistoryLoader | null = null;

  static getInstance(newInstance?: Time2BlocksHistoryLoader): Time2BlocksHistoryLoader {
    if (!this.instance) {
      this.instance = newInstance || new Time2BlocksHistoryLoader();
    }

    return this.instance;
  }

  //  starts with a basic historic for light mode
  // 🔥🔥🔥🔥🔥🔥🔥
  history: TBlockchainTimeHistory = {"1694628304":807500,"1694629434":807501,"1694629923":807502,"1694630354":807503,"1694631328":807504,"1694631354":807505,"1694631939":807506,"1694632075":807507,"1694632220":807508,"1694632597":807509,"1694632671":807510,"1694633045":807511,"1694633573":807512,"1694633935":807513,"1694634127":807514,"1694634714":807515,"1694634786":807516,"1694635076":807517,"1694635548":807518,"1694635568":807519,"1694635589":807520,"1694637204":807521,"1694638174":807522,"1694638351":807523,"1694638785":807524,"1694638849":807525,"1694638991":807526,"1694640340":807527,"1694641538":807528,"1694642418":807529,"1694642551":807530,"1694642574":807531,"1694642917":807532,"1694642973":807533,"1694643377":807534,"1694644529":807535,"1694644570":807536,"1694645231":807537,"1694646859":807538,"1694647558":807539,"1694647807":807540,"1694647856":807541,"1694648211":807542,"1694648684":807543,"1694649462":807544,"1694650774":807545,"1694651781":807546,"1694652088":807547,"1694652291":807548,"1694655059":807549,"1694657376":807550,"1694657836":807551,"1694658423":807552,"1694658714":807553,"1694659484":807554,"1694659607":807555,"1694660157":807556,"1694660373":807557,"1694661287":807558,"1694661374":807559,"1694662425":807560,"1694663125":807561,"1694663514":807562,"1694664240":807563,"1694664752":807564,"1694665543":807565,"1694665603":807566,"1694665785":807567,"1694665855":807568,"1694665886":807569,"1694666482":807570,"1694667073":807571,"1694667157":807572,"1694667684":807573,"1694667781":807574,"1694668171":807575,"1694668249":807576,"1694668404":807577,"1694668620":807578,"1694670538":807579,"1694670656":807580,"1694670807":807581,"1694671211":807582,"1694671782":807583,"1694672956":807584,"1694673045":807585,"1694673629":807586,"1694673724":807587,"1694673803":807588,"1694674180":807589,"1694674422":807590,"1694674614":807591,"1694674640":807592,"1694676198":807593,"1694676604":807594,"1694677006":807595,"1694677529":807596,"1694678289":807597,"1694679447":807598,"1694679742":807599,"1694680557":807600,"1694680820":807601,"1694680960":807602,"1694681054":807603,"1694681157":807604,"1694682165":807605,"1694682807":807606,"1694683001":807607,"1694683064":807608,"1694684425":807609,"1694687806":807610,"1694687935":807611,"1694689283":807612,"1694690134":807613,"1694690667":807614,"1694690783":807615,"1694691164":807616,"1694691275":807617,"1694691733":807618,"1694692419":807619};

  private readonly mempoolApi = 'https://mempool.space/api/';

  mempoolConn: Time2BlockMempoolConn | null = null;
  blockchainInfoConn: Time2BlocksBlockchainInfoConn | null = null;
  listening = false;

  constructor() { return Time2BlocksHistoryLoader.getInstance(this); }

  setIndex(history: TBlockchainTimeHistory): void {
    this.history = history;
  }

  updateIndex(history: TBlockchainTimeHistory): void {
    this.history = { ...this.history, ...history };
  }

  addBlock(block: number, timestamp: string): void {
    this.history[timestamp] = block;
  }

  async loadIndex(path?: string): Promise<void> {
    const response = await fetch(path || './history.json');
    this.history = await response.json();
    return Promise.resolve();
  }

  // TODO: listen to personal bitcoin node running on computer or remote
  listenCustomBitcoinNode(): void {
    throw new Error('listen custom bitoin node not implemented yet');
  }

  listenMempool(): void {
    this.listening = true;
    this.mempoolConn = new Time2BlockMempoolConn();
    this.mempoolConn.onBlock(block => this.addBlock(block.height, block.timestamp))
  }

  listenBlockchainInfo(): void {
    this.listening = true;
    this.blockchainInfoConn = new Time2BlocksBlockchainInfoConn();
    this.blockchainInfoConn.onBlock(block => this.addBlock(block.height, block.timestamp))
  }

  listen(): void {
    this.listening = true;
    if (this.blockchainInfoConn) {
      this.blockchainInfoConn.connect();
    }

    if (this.mempoolConn) {
      this.mempoolConn.connect();
    }
  }

  stopListen(): void {
    this.listening = false;
    if (this.blockchainInfoConn) {
      this.blockchainInfoConn.close();
    }

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

  async getBlock(height: number): Promise<{ height: number, timestamp: string }> {
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
      const startTimestamp = historyAsKeys[historyAsKeys.length - 1];
      const endTimestamp = historyAsKeys[historyAsKeys.length - 20];

      historyAsKeys = null;

      const startHeight = this.history[startTimestamp];
      const endHeight = this.history[endTimestamp];

      start = { height: startHeight, timestamp: startTimestamp };
      end = { height: endHeight, timestamp: endTimestamp };
    }

    const blocksDifference = new Calc(end.height).minus(start.height).finish();
    const timeDifference = new Calc(Number(end.timestamp))
      .minus(Number(start.timestamp))
      .finish();

    const estimatedTimeForEachBlock = new Calc(timeDifference)
      .divide(blocksDifference)
      .finish();

    const timeDifferenceBetweenReferenceAndArg = new Calc(timestamp)
      .minus(Number(start.timestamp))
      .finish();

    const estimatedBlocksFromStartReference = new Calc(timeDifferenceBetweenReferenceAndArg)
      .divide(estimatedTimeForEachBlock)
      .pipe(v => Math.floor(v))
      .finish();

    return new Calc(start.height).sum(estimatedBlocksFromStartReference).finish();
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

export abstract class Time2BlockWebsocketConnection extends Time2BlockConnection {
  protected abstract readonly link;

  protected client = new websocket.client;
  protected conn = null;

  constructor() {
    super();

    this.client.on('connect', (conn: any) => this.onConnect(conn));
    this.client.on('connectFailed', () => console.error(`connection to ${this.link} failed`));
    this.connect();
  }

  protected onConnect(conn: any): void {
    this.conn = conn;

    conn.on('close', () => this.onClose());
    conn.on('message', packet => this.onMessage(packet));
    conn.on('error', err => console.error('error', err));

    this.blockSubscribe();
  }

  protected abstract blockSubscribe(): void;
  protected abstract onMessage(packet: any): void;

  close(): void {
    if (this.conn) {
      this.conn.close();
    }
  }

  private onClose(): void {
    this.conn = null;
  }

  connect(): void {
    this.client.connect(this.link);
  }
}

export class Time2BlockMempoolConn extends Time2BlockWebsocketConnection {

  protected readonly link = 'wss://mempool.space/api/v1/ws';

  protected blockSubscribe(): void {
    this.conn.sendUTF(JSON.stringify({ "action": "init" }));
    this.conn.sendUTF(JSON.stringify({ "action": "want", "data": ['blocks'] }));
  }

  protected onMessage(packet: any): void {
    console.info('mempool packet', packet );
    const res = JSON.parse(packet.toString());
    if (res.block) {
      const { height, time } = res.block;
      this.emit({ height, time: String(time) });
    }

    if (packet.type != 'utf8')
      return;
  }
}

export class Time2BlocksBlockchainInfoConn extends Time2BlockWebsocketConnection {
  protected readonly link = 'wss://ws.blockchain.info/inv';

  protected blockSubscribe(): void {
    const encoded = JSON.stringify({ op: "blocks_sub" });
    this.conn.sendUTF(encoded);
  }

  protected onMessage(packet: any): void {
    if (packet.type != 'utf8')
      return;

    const packetParsed = JSON.parse(packet.utf8Data);
    const { op } = packetParsed;

    if (op == 'blocks') {
      const { x: { height, time } } = packetParsed;
      this.emit({ height, time });
    }
  }
}

