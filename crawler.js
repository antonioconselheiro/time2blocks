https://www.blockchain.com/explorer/blocks/btc?page=3
var blocksToTime = {}
function check(page = 1) {
  fetch('https://www.blockchain.com/explorer/_next/data/d589423/blocks/btc.json?page=' + page + '&asset=btc')
  .then(response => {
    if (!response.ok) {
      throw new Error('A solicitação não teve sucesso');
    }
    return response.json();
  })
  .then(data => {
    data.pageProps.latestBlocks.forEach(block => {
        blocksToTime[block.time] = block.height;
        console.info('block: ', block.height);
        if (block.height === 0 ) { throw new Error('chega'); }
    });
    setTimeout(() => check(page + 1), 400);
  })
  .catch(error => {
    console.error('Houve um erro na solicitação:', error);
      console.error('https://www.blockchain.com/explorer/_next/data/d589423/blocks/btc.json?page=' + page + '&asset=btc');
      setTimeout(() => check(page), 30000);
  });
}
check(1);

/////
var keys = Object.keys(blocksToTime);
var baseHistory = {};
for (var i = 0; i < keys.length; i += 800) {
  baseHistory[keys[i]] = blocksToTime[keys[i]];
}

console.info(JSON.stringify(baseHistory));