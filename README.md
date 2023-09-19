#### Provérbios 10
⁴ O preguiçoso fica pobre, mas quem se esforça no trabalho enriquece.
⁵ Quem tem juízo colhe no tempo certo, mas quem dorme na época da colheita passa vergonha.
⁶ Os bons são abençoados. As palavras dos maus escondem a sua violência.
⁷ Os bons serão lembrados como uma bênção, porém os maus logo serão esquecidos.

# Time2Blocks

[![npm version](https://badge.fury.io/js/@belomonte%2Ftime2blocks.svg)](https://github.com/antonioconselheiro/time2blocks)
[![Npm Total Downloads](https://img.shields.io/npm/dt/@belomonte/time2blocks.svg)](https://github.com/antonioconselheiro/time2blocks)
[![Npm Monthly Downloads](https://img.shields.io/npm/dm/@belomonte/time2blocks.svg)](https://github.com/antonioconselheiro/time2blocks)
[![Build Status](https://travis-ci.org/antonioconselheiro/time2blocks.svg?branch=master)](https://travis-ci.org/antonioconselheiro/time2blocks)


_____

TypeScript library that identify which time is associated which blockchain block in the past.
The main purpose of the library is to provide a means for nostr clients to enable them to display which block a given message was published to.

## Instalation

For full lib (16mb, because include a great block_x_timestamp index file), you must load the ```history.json``` file to load it:
```npm install @belomonte/time2blocks --save```

Without this index (130kb):
```npm install @belomonte/time2blocks-light --save```

Lib for Angular usage:
```npm install @belomonte/time2blocks-ngx --save```

[I can reference here if you create a wrapper lib for nextjs, vuejs or react.]

## Usage
```typescript
import { time2Blocks } from '@belomonte/time2blocks-light';
async function run() {
  const now = new Date().getTime();
  const block = await time2Blocks.getFromMillisecondsTimestamp(now);
  const sameBlock = await time2Blocks.getFromTimestamp(Math.floor(now / 1000));
  const sameBlockAgain = await time2Blocks.getFromMinutes(Math.floor(now / 60_000));

  const formatted = time2Blocks.format(block, 'H, bb');
  const formatted2 = time2Blocks.format(sameBlock, 'h, B');
  const formatted3 = time2Blocks.format(sameBlockAgain, '-%%% [to next halving]');

  console.info('time as block, formatted: ', formatted);
  console.info('time as block, formatted: ', formatted2);
  console.info('time as block, formatted: ', formatted3);

  return Promise.resolve();
}

run().catch(e => console.error(e))
```

![formats](https://raw.githubusercontent.com/antonioconselheiro/time2blocks/master/docs/time2blocks.png)


## Grow NOSTR
To improve the library, it would be good:
 - if a way to search for which blocks were processed around one moment (a timestamp) or more than one moment was available in the mempool api;
 - be possible to include what the block was at the time of publication in NOSTR;

## Donate
Help me continue working on tools for the bitcoin and nostr universe, like this one. #zapthedev

There's still a lot of work to do.

Lighting donate: [lightning:peevedbeer57@walletofsatoshi.com](lightning:peevedbeer57@walletofsatoshi.com)

![zap me with lighting network](https://raw.githubusercontent.com/antonioconselheiro/time2blocks/master/docs/qrcode-wallet-lighting.png)

Bitcoin onchain donate: [bitcoin:bc1qrm99lmmpwk7zsh7njpgthw87yvdm38j2lzpq7q](bitcoin:bc1qrm99lmmpwk7zsh7njpgthw87yvdm38j2lzpq7q)

![on-chain transfer](https://raw.githubusercontent.com/antonioconselheiro/time2blocks/master/docs/qrcode-wallet-bitcoin.png)

## Contribute
[CONTRIBUTE.md](./CONTRIBUTE.md)
