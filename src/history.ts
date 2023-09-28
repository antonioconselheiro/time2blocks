import { Calc } from 'calc-js';
import { calcConfig } from './calc-config';
import { WebSocket as WebSocketNode } from 'ws';
import { baseHistory } from './base-history';

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
  history: TBlockchainTimeHistory = baseHistory;

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


/**
 * TODO:
 * Como deve ficar o algoritimo:
 * 
 * o bloco mais recente deve ser marcado como último bloco, para servir como referência;
 * 
 * busca indexadas pode retornar bloco ou blocoA e blocoB sugerindo que haja uma consulta
 * na mempool para atualização;
 * 
 * o blocoA e blocoB devem ser entregues a um algoritimo que calculará o seguinte:
 * - a distancia de tempo entre a e b;
 * - a distancia de blocos entre a e b;
 * - com essas informações identificarei uma estimativa de quanto tempo demora para
 * processar cada bloco na região de tempo consultada;
 * - considerando a diferença de tempo entre o tempo do blocoA e o tempo solicitado e
 * considerando a estimativa de quanto tempo demora para processar cada bloco se chega
 * a um provavel bloco correspondente ao tempo passado;
 * - a partir da informação do bloco estimado para o tempo solicitado é feita uma consulta
 * na mempool para atualizar os blocos ao redor do bloco estimado;
 * - a consulta é iniciada novamente com a expectativa de que o tempo entregue agora retorne
 * um bloco indexado, por conta da atualização com a mempool, se este não for o caso, então
 * uma nova consulta para atualização será feita na mempool;
 * 
 * IMPORTANTE: não se deve ocorrer diversas consultas em paralelo, todas as buscas no indice
 * devem aguardar as requisições em curso para atualização dos dados, isso impede consultas
 * repetidas simultâneas
 * 
 * 
 * 
 * 
 * 2. Garantir o funcionamento da exibição do bloco atual sem formatação
 * 
 * 3. Retestar o comportamento do time2blocks quando não houvererem os dados
 * indexados e a distância de tempo for muito grande desde a última atualização
 * 
 */