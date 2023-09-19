import { Time2Blocks } from '.';

const time2Blocks = Time2Blocks.getInstance(false);

describe('raw time 2 blocks', () => {
  test('indexed time', () => {
    expect(time2Blocks.getHistoryFromTimestamp(1694632075)).toBe(807507);
  });

  test('not indexed time', () => {
    expect(time2Blocks.getHistoryFromTimestamp(1694632076)).toBe(807507);
  });
});

describe('formatted blocks', () => {

  const block = 732861;

  test('h and b format', () => {
    const result = time2Blocks.format(block, 'h [halving, block] b');
    expect(result).toBe('3 halving, block 102861');
  });

  test('H and bb format', () => {
    const result = time2Blocks.format(block, 'H [halving], [block] bb');
    expect(result).toBe('4 halving, block 102,861');
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