import { Calc } from "calc-js";
import { Time2BlocksUtil } from "./util";

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
export class Time2BlocksFormat {

  private static instance: Time2BlocksFormat | null = null;

  static getInstance(newInstance?: Time2BlocksFormat): Time2BlocksFormat {
    if (!this.instance) {
      this.instance = newInstance || new Time2BlocksFormat();
    }

    return this.instance;
  }

  constructor() { return Time2BlocksFormat.getInstance(this); }

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
      .divide(Time2BlocksUtil.blocksPerHalving)
      .pipe(v => Math.floor(v))
      .finish();
  }

  private formatHalvings(block: number, format: string): string {
    if (Time2BlocksUtil.hasHalving.test(format)) {
      const halving = this.getHalvingFromBlocks(block);

      format = format.replace(Time2BlocksUtil.hasHalving, String(halving));
    }

    return format;
  }

  private formatBlocksInThisHalving(block: number, format: string): string {
    if (Time2BlocksUtil.hasb.test(format)) {
      format = format.replace(Time2BlocksUtil.hasb, String(block));
    }

    return format;
  }

  private formatBlocksInThisHalvingWithCommas(
    block: number, format: string, numberSeparator: string
  ): string {
    if (Time2BlocksUtil.hasbb.test(format)) {
      format = format.replace(Time2BlocksUtil.hasbb, String(block).replace(
        Time2BlocksUtil.formatNumberWithSeparator, numberSeparator)
      );
    }

    return format;
  }

  private formatTotalBlocks(
    block: number, format: string
  ): string {
    if (Time2BlocksUtil.hasB.test(format)) {
      format = format.replace(
        Time2BlocksUtil.hasB, String(block)
      );
    }

    return format;
  }

  private formatTotalBlocksWithCommas(
    block: number, format: string, numberSeparator: string
  ): string {
    if (Time2BlocksUtil.hasBB.test(format)) {
      format = format.replace(
        Time2BlocksUtil.hasBB, String(block).replace(Time2BlocksUtil.formatNumberWithSeparator, numberSeparator)
      );
    }

    return format;
  }

  private getThisHalvingBlocks(block: number): number {
    const halving = this.getHalvingFromBlocks(block);

    //  blocksInThisHalving = blocks - (halving / 210_000)
    return new Calc(block).minus(
      new Calc(halving)
        .multiply(Time2BlocksUtil.blocksPerHalving)
        .finish()
    ).finish();
  }

  private formatPercentInThisHalving(thisHalvingBlock: number, format: string): string {
    const fullPercent = 100;

    //  rawPercent = thisHalvingBlock / 210_000
    const rawPercent = new Calc(thisHalvingBlock)
      .divide(Time2BlocksUtil.blocksPerHalving)
      .multiply(fullPercent)
      .finish();

    [
      Time2BlocksUtil.hasNextHalvingPercent4, Time2BlocksUtil.hasNextHalvingPercent3,
      Time2BlocksUtil.hasNextHalvingPercent2, Time2BlocksUtil.hasNextHalvingPercent,
      Time2BlocksUtil.hasThisHalvingPercent4, Time2BlocksUtil.hasThisHalvingPercent3,
      Time2BlocksUtil.hasThisHalvingPercent2, Time2BlocksUtil.hasThisHalvingPercent
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
    const decimalBase = Time2BlocksUtil.decimalBaseMap[String(formatType)] || null;
    const isToNextHalving = Time2BlocksUtil.isNextHalving[String(formatType)] || false;

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