import { Time2Blocks, Time2BlocksHistoryLoader } from '.';

const time2Blocks = Time2Blocks.getInstance(false);

describe('raw time 2 blocks', () => {
  test('indexed time', () => {
    const result = time2Blocks.getBlockFromTimestamp(1694557398);
    expect('block' in result && result.block).toBe(807385);
  });

  test('not indexed time', () => {
    const result = time2Blocks.getBlockFromTimestamp(1694557399);
    expect('block' in result && result.block).toBe(807385);
  });

  test('not indexed time get blocks around', () => {
    const result = time2Blocks.getBlockFromTimestamp(1690337500);
    expect(result).toEqual({
      blockA: 799384,
      blockB: 800184
    });
  });

  test('estimated block after block b', () => {
    const history = Time2BlocksHistoryLoader.getInstance();
    const result =  history.getEstimatedBlockFromTimestamp(1690337500, {
      height: 799384,
      timestamp: "1689767447"
    }, {
      height: 800184,
      timestamp: "1690272048"
    });

    expect(result).toEqual(800288);
  });

  test('estimated block between blocks', () => {
    const history = Time2BlocksHistoryLoader.getInstance();
    const result =  history.getEstimatedBlockFromTimestamp(1690168630, {
      height: 799384,
      timestamp: "1689767447"
    }, {
      height: 800184,
      timestamp: "1690272048"
    });

    expect(result).toEqual(798748);
  });

  
});

describe('formatted blocks', () => {

  const block = 732861;

  test('h and b format', () => {
    const result = time2Blocks.format(block, 'h [halving, block] b');
    expect(result).toBe('3 halving, block 102861');
  });

  test('H and bb format', () => {
    const result = time2Blocks.format(block, '[block] bb, [next halving] H');
    expect(result).toBe('block 102,861, next halving 4');
  });

  test('B format', () => {
    const result = time2Blocks.format(block, '⚡ [since block] B ⚡');
    expect(result).toBe('⚡ since block 732861 ⚡');
  });

  test('BB format', () => {
    const result = time2Blocks.format(block, '⚡ [since block] BB ⚡');
    expect(result).toBe('⚡ since block 732,861 ⚡');
  });

  test('BB format width different separator', () => {
    const result = time2Blocks.format(block, '⚡ [since block] BB ⚡', '.');
    expect(result).toBe('⚡ since block 732.861 ⚡');
  });

  test('raw percent', () => {
    const result = time2Blocks.format(block, 'H, %%%%');
    expect(result).toBe('4, 48.98142857142857%');
  });

  test('percent formatted', () => {
    const result = time2Blocks.format(block, 'H, %%');
    expect(result).toBe('4, 48.98%');
  });

  test('percent to next halving', () => {
    const result = time2Blocks.format(block, '[Halving count down:] -%%');
    expect(result).toBe('Halving count down: 51.01%');
  });
});

describe('testing escape char []', () => {
  const block = 732861;

  test('[h] h', () => {
    expect(time2Blocks.format(block, '[h] h')).toBe('h 3');
  });

  test('[H] H', () => {
    expect(time2Blocks.format(block, '[H] H')).toBe('H 4');
  });

  test('[b] b', () => {
    expect(time2Blocks.format(block, '[b] b')).toBe('b 102861');
  });

  test('[bb] bb', () => {
    expect(time2Blocks.format(block, '[bb] bb')).toBe('bb 102,861');
  });

  test('[B] B', () => {
    expect(time2Blocks.format(block, '[B] B')).toBe('B 732861');
  });

  test('[BB] BB', () => {
    expect(time2Blocks.format(block, '[BB] BB')).toBe('BB 732,861');
  });

  test('[%] %', () => {
    expect(time2Blocks.format(block, '[%] %')).toBe('% 48.9%');
  });

  test('[%%] %%', () => {
    expect(time2Blocks.format(block, '[%%] %%')).toBe('%% 48.98%');
  });

  test('[%%%] %%%', () => {
    expect(time2Blocks.format(block, '[%%%] %%%')).toBe('%%% 48.981%');
  });

  test('[%%%%] %%%%', () => {
    expect(time2Blocks.format(block, '[%%%%] %%%%')).toBe('%%%% 48.98142857142857%');
  });

  test('[-%] -%', () => {
    expect(time2Blocks.format(block, '[-%] -%')).toBe('-% 51%');
  });

  test('[-%%] -%%', () => {
    expect(time2Blocks.format(block, '[-%%] -%%')).toBe('-%% 51.01%');
  });

  test('[-%%%] -%%%', () => {
    expect(time2Blocks.format(block, '[-%%%] -%%%')).toBe('-%%% 51.018%');
  });

  test('[-%%%%] -%%%%', () => {
    expect(time2Blocks.format(block, '[-%%%%] -%%%%')).toBe('-%%%% 51.01857142857143%');
  });

  test('[[h] h]', () => {
    expect(time2Blocks.format(block, '[[h] h]')).toBe('h h');
  });

});