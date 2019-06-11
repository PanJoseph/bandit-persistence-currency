import assign from 'object-assign';
import { del, get, set, Store } from 'idb-keyval';

const banditTeasureTrove = new Store('bandit', 'bandit-treasure-trove');

export function isCoinExpired(coin) {
  return (
    coin &&
    coin.metadata &&
    coin.metadata.persist &&
    coin.metadata.persist.cacheTime &&
    Date.now() >= coin.metadata.persist.cacheTime
  );
}

export function shouldUpdateCoin(newCoin, oldCoin) {
  return (
    newCoin &&
    (!oldCoin ||
      !oldCoin.metadata ||
      !oldCoin.metadata.persist ||
      oldCoin.metadata.persist.version !== newCoin.metadata.persist.version)
  );
}

export function removeCoin(name) {
  return del(name, banditTeasureTrove)
    .then(() => null)
    .catch(error => {
      throw error;
    });
}

export function retrieveCoin(name) {
  return get(name, banditTeasureTrove)
    .then(coin => {
      if (!coin) {
        return null;
      }

      if (isCoinExpired(coin)) {
        return removeCoin(name);
      }

      return coin;
    })
    .catch(error => {
      throw error;
    });
}

export function cacheCoin(coin, forceUpdate = false) {
  return retrieveCoin(coin.name).then(existingCoin => {
    if (forceUpdate || shouldUpdateCoin(coin, existingCoin)) {
      const cacheTime = coin.metadata.persist.cacheTime || Infinity;
      const timeStored = Date.now();
      const version = coin.metadata.persist.version || null;

      const mergedMetadata = assign({}, coin.metadata, {
        persist: {
          expirationTime: timeStored + cacheTime,
          cacheTime,
          timeStored,
          version
        }
      });

      return set(coin.name, assign({}, coin, { metadata: mergedMetadata }), banditTeasureTrove)
        .then(() => true)
        .catch(error => {
          throw error;
        });
    }

    return null;
  });
}

export default {
  cacheCoin,
  removeCoin,
  retrieveCoin
};
