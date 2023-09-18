import { Calc } from 'calc-js';
import { history } from './history';

export class Time2Blocks {

  private static instance: Time2Blocks | null = null;

  static getInstance(newInstance?: Time2Blocks): Time2Blocks {
    if (!this.instance) {
      this.instance = newInstance || new Time2Blocks();
    }

    return this.instance;
  }

  private readonly blocksPerHalving = 210_000;

  private readonly hasHalving = /(h)(?![^\[]*\])/ig;
  private readonly hasb = /(\bb\b)(?![^\[]*\])/g;
  private readonly hasbb = /(bb)(?![^\[]*\])/g;
  private readonly hasB = /(\bB\b)(?![^\[]*\])/g;
  private readonly hasBB = /(BB)(?![^\[]*\])/g;

  private readonly hasThisHalvingPercent = /(%)(?![^\[]*\])/g;
  private readonly hasThisHalvingPercent2 = /(%%)(?![^\[]*\])/g;
  private readonly hasThisHalvingPercent3 = /(%%%)(?![^\[]*\])/g;
  private readonly hasThisHalvingPercent4 = /(%%%%)(?![^\[]*\])/g;

  private readonly hasNextHalvingPercent = /(\-%)(?![^\[]*\])/g;
  private readonly hasNextHalvingPercent2 = /(\-%%)(?![^\[]*\])/g;
  private readonly hasNextHalvingPercent3 = /(\-%%%)(?![^\[]*\])/g;
  private readonly hasNextHalvingPercent4 = /(\-%%%%)(?![^\[]*\])/g;

  private readonly formatNumberWithSeparator = /\B(?=(\d{3})+(?!\d))/g;

  private readonly decimalBaseMap = {
    [String(this.hasThisHalvingPercent)]: 10,
    [String(this.hasThisHalvingPercent2)]: 100,
    [String(this.hasThisHalvingPercent3)]: 1000,

    [String(this.hasNextHalvingPercent)]: 10,
    [String(this.hasNextHalvingPercent2)]: 100,
    [String(this.hasNextHalvingPercent3)]: 1000
  };

  private readonly isNextHalving = {
    [String(this.hasNextHalvingPercent)]: true,
    [String(this.hasNextHalvingPercent2)]: true,
    [String(this.hasNextHalvingPercent3)]: true,
    [String(this.hasNextHalvingPercent4)]: true
  }

  constructor() { return Time2Blocks.getInstance(this); }

  getFromTimestamp(timestamp: number): number | null {
    const block = history[timestamp];

    if (block) {
      return block;
    } else {
      const timeKey = this.getTimeWithBlockIndexedFromTime(timestamp, Object.keys(history));
      return timeKey && history[timeKey] || null;
    }
  }

  getFromMillisecondsTimestamp(timestamp: number): number | null {
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

  /**
   * Format blocks
   * 
   * @param block 
   * the block to be formatted
   *
   * @param format
   * h - halvings
   * H - halvings too, but now h is in uppercase
   * b - blocks in this halving
   * B - all blocks
   * bb - blocks in this halving in format 000,000
   * BB - All blocks in format 0,000,000
   *
   * % - blocks in this halving in percentage: 0.0% ~ 100.0%, 
   * %% - blocks in this halving in percentage: 0.00% ~ 100.00%, 
   * %%% - blocks in this halving in percentage: 0.000% ~ 100.000%, 
   * %%%% - blocks in this halving in raw percentage: 0.x ~ 100.x%, 65.4234234234234%, 21.5%
   * 
   * -% - blocks to next halving in percentage: 0.0% ~ 100.0%, 
   * -%% - blocks to next halving in percentage: 0.00% ~ 100.00%, 
   * -%%% - blocks to next halving in percentage: 0.000% ~ 100.000%, 
   * -%%%% - blocks to next halving in raw percentage: 0.x ~ 100.x%, 65.4234234234234%, 21.5%
   * 
   * So, if your format string include the letter h, b or B you should escape this:
   * blocksFormat(80000, 'h [Halvings], [block] bb') will return: 3 Halvings, block 170,000
   * blocksFormat(80000, 'h [[Halvings]], [[block]] bb') will return: 3 Halvings, block 170,000
   */
  format(block: number, format: string, numberSeparator = ','): string {

    const thisHalvingBlock = this.getThisHalvingBlocks(block);
    let formatted = this.formatHalvings(block, format);
    formatted = this.formatBlocksInThisHalving(thisHalvingBlock, formatted);
    formatted = this.formatTotalBlocks(block, formatted);
    formatted = this.formatBlocksInThisHalvingWithCommas(thisHalvingBlock, formatted, numberSeparator);
    formatted = this.formatPercentInThisHalving(thisHalvingBlock, formatted);
    formatted = this.formatTotalBlocksWithCommas(block, formatted, numberSeparator);
    formatted = this.removeEscapeBrackets(formatted);

    return formatted;
  }

  private getHalvingFromBlocks(block: number): number {
    return new Calc(block)
      .divide(this.blocksPerHalving)
      .pipe(v => Math.floor(v))
      .finish();
  }

  private formatHalvings(block: number, format: string): string {
    if (this.hasHalving.test(format)) {
      const halving = this.getHalvingFromBlocks(block);

      format = format.replace(this.hasHalving, String(halving));
    }

    return format;
  }

  private formatBlocksInThisHalving(block: number, format: string): string {
    if (this.hasb.test(format)) {
      format = format.replace(this.hasb, String(block));
    }

    return format;
  }

  private formatBlocksInThisHalvingWithCommas(
    block: number, format: string, numberSeparator: string
  ): string {
    if (this.hasbb.test(format)) {
      format = format.replace(this.hasbb, String(block).replace(
        this.formatNumberWithSeparator, numberSeparator)
      );
    }

    return format;
  }

  private formatTotalBlocks(
    block: number, format: string
  ): string {
    if (this.hasB.test(format)) {
      format = format.replace(
        this.hasB, String(block)
      );
    }

    return format;
  }

  private formatTotalBlocksWithCommas(
    block: number, format: string, numberSeparator: string
  ): string {
    if (this.hasBB.test(format)) {
      format = format.replace(
        this.hasBB, String(block).replace(this.formatNumberWithSeparator, numberSeparator)
      );
    }

    return format;
  }

  private getThisHalvingBlocks(block: number): number {
    const halving = this.getHalvingFromBlocks(block);

    //  blocksInThisHalving = blocks - (halving / 210_000)
    return new Calc(block).minus(
      new Calc(halving)
        .multiply(this.blocksPerHalving)
        .finish()
    ).finish();
  }

  private formatPercentInThisHalving(thisHalvingBlock: number, format: string): string {
    const fullPercent = 100;

    //  rawPercent = thisHalvingBlock / 210_000
    const rawPercent = new Calc(thisHalvingBlock)
      .divide(this.blocksPerHalving)
      .multiply(fullPercent)
      .finish();

    [
      this.hasNextHalvingPercent4, this.hasNextHalvingPercent3,
      this.hasNextHalvingPercent2, this.hasNextHalvingPercent,
      this.hasThisHalvingPercent4, this.hasThisHalvingPercent3,
      this.hasThisHalvingPercent2, this.hasThisHalvingPercent
    ].forEach(hasPercentIndex => {
      if (hasPercentIndex.test(format)) {
        format = format.replace(
          hasPercentIndex, `[${this.formatPercent(rawPercent, hasPercentIndex)}%]`
        );
      }
    });

    return format;
  }

  private formatPercent(rawPercent: number, formatType: RegExp): string {
    const decimalBase = this.decimalBaseMap[String(formatType)] || null;
    const isToNextHalving = this.isNextHalving[String(formatType)] || false;

    let calc: Calc;
    
    if (isToNextHalving) {
      const fullPercent = 100;
      calc = new Calc(fullPercent).minus(rawPercent);
    } else {
      calc = new Calc(rawPercent)
    }
      
    if (decimalBase !== null) {
      calc = calc.multiply(decimalBase)
        .pipe(v => Math.floor(v))
        .divide(decimalBase);
    }
    
    return calc.finish().toString();
  }

  private removeEscapeBrackets(formatted: string): string {
    return formatted.replace(/[\[\]]/g, '');
  }
}

export const time2Blocks = new Time2Blocks();

