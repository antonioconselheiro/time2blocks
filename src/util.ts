export class Time2BlocksUtil {
  static readonly blocksPerHalving = 210_000;

  static readonly hasHalving = /(h)(?![^\[]*\])/ig;
  static readonly hasb = /(\bb\b)(?![^\[]*\])/g;
  static readonly hasbb = /(bb)(?![^\[]*\])/g;
  static readonly hasB = /(\bB\b)(?![^\[]*\])/g;
  static readonly hasBB = /(BB)(?![^\[]*\])/g;

  static readonly hasThisHalvingPercent = /(%)(?![^\[]*\])/g;
  static readonly hasThisHalvingPercent2 = /(%%)(?![^\[]*\])/g;
  static readonly hasThisHalvingPercent3 = /(%%%)(?![^\[]*\])/g;
  static readonly hasThisHalvingPercent4 = /(%%%%)(?![^\[]*\])/g;

  static readonly hasNextHalvingPercent = /(\-%)(?![^\[]*\])/g;
  static readonly hasNextHalvingPercent2 = /(\-%%)(?![^\[]*\])/g;
  static readonly hasNextHalvingPercent3 = /(\-%%%)(?![^\[]*\])/g;
  static readonly hasNextHalvingPercent4 = /(\-%%%%)(?![^\[]*\])/g;

  static readonly formatNumberWithSeparator = /\B(?=(\d{3})+(?!\d))/g;

  static readonly decimalBaseMap = {
    [String(Time2BlocksUtil.hasThisHalvingPercent)]: 10,
    [String(Time2BlocksUtil.hasThisHalvingPercent2)]: 100,
    [String(Time2BlocksUtil.hasThisHalvingPercent3)]: 1000,

    [String(Time2BlocksUtil.hasNextHalvingPercent)]: 10,
    [String(Time2BlocksUtil.hasNextHalvingPercent2)]: 100,
    [String(Time2BlocksUtil.hasNextHalvingPercent3)]: 1000
  };

  static readonly isNextHalving = {
    [String(Time2BlocksUtil.hasNextHalvingPercent)]: true,
    [String(Time2BlocksUtil.hasNextHalvingPercent2)]: true,
    [String(Time2BlocksUtil.hasNextHalvingPercent3)]: true,
    [String(Time2BlocksUtil.hasNextHalvingPercent4)]: true
  }
}
