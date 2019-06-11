import { cacheCoin } from './webCache';

export default function applyCache(chest) {
  const coinNames = Object.keys(chest);

  coinNames.forEach(name => {
    const coin = chest[name];

    if (coin.metadata.persist) {
      cacheCoin(coin);
    }
  });
}
