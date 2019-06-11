import 'fake-indexeddb/auto';
import { clear, get, set, Store } from 'idb-keyval';

import { cacheCoin, isCoinExpired, removeCoin, retrieveCoin, shouldUpdateCoin } from '../webCache';

describe('webCache module tests', () => {
  const banditTeasureTrove = new Store('bandit', 'bandit-treasure-trove');

  describe('isCoinExpired tests', () => {
    it('returns false when the coin is not valid', () => {
      expect(isCoinExpired(null)).toBeFalsy();
    });

    it('returns false when the coin does not have an expiration time', () => {
      expect(isCoinExpired({ name: 'testCoin', metadata: { persist: {} } })).toBeFalsy();
    });

    it('returns false when the coin does not have a valid expiration time', () => {
      expect(
        isCoinExpired({ name: 'testCoin', metadata: { persist: { cacheTime: null } } })
      ).toBeFalsy();
    });

    it('returns false when the coin has an expiration time that has not passed yet', () => {
      expect(
        isCoinExpired({
          name: 'testCoin',
          metadata: { persist: { cacheTime: Date.now() + 100000 } }
        })
      ).toBeFalsy();
    });

    it('returns true when the coin has an expiration time that has passed already', () => {
      expect(
        isCoinExpired({
          name: 'testCoin',
          metadata: { persist: { cacheTime: Date.now() - 100000 } }
        })
      ).toBeTruthy();
    });
  });

  describe('shouldUpdateCoin tests', () => {
    it('returns false when the new coin is not valid', () => {
      expect(shouldUpdateCoin(null, { name: 'oldCoin', metadata: { persist: {} } })).toBeFalsy();
    });

    it('returns false when a coin is already in the db', () => {
      expect(
        shouldUpdateCoin(
          { name: 'newCoin', metadata: { persist: {} } },
          { name: 'oldCoin', metadata: { persist: {} } }
        )
      ).toBeFalsy();
    });

    it('returns false when the version of the coins match', () => {
      expect(
        shouldUpdateCoin(
          { name: 'newCoin', metadata: { persist: { version: 1 } } },
          { name: 'oldCoin', metadata: { persist: { version: 1 } } }
        )
      ).toBeFalsy();
    });

    it('returns true when a coin is not already in the db', () => {
      expect(shouldUpdateCoin({ name: 'newCoin', metadata: { persist: {} } }, null)).toBeTruthy();
    });

    it('returns true when the versions of the coins do not match', () => {
      expect(
        shouldUpdateCoin(
          { name: 'newCoin', metadata: { persist: { version: 2 } } },
          { name: 'oldCoin', metadata: { persist: { version: 1 } } }
        )
      ).toBeTruthy();
    });
  });

  describe('removeCoin tests', () => {
    afterEach(() => {
      clear(banditTeasureTrove);
    });

    it('removes a coin properly', () => {
      set('testCoin', { name: 'testCoin', metadata: { persist: {} } }, banditTeasureTrove);

      expect(get('testCoin', banditTeasureTrove)).resolves.toEqual({
        name: 'testCoin',
        metadata: { persist: {} }
      });

      return removeCoin('testCoin').then(coin => {
        expect(coin).toBeFalsy();
        return expect(get('testCoin', banditTeasureTrove)).resolves.toBeFalsy();
      });
    });
  });

  describe('retrieveCoin tests', () => {
    afterEach(() => {
      clear(banditTeasureTrove);
    });

    it('returns null when the coin does not exist', () =>
      expect(retrieveCoin('fakeCoin')).resolves.toBeFalsy());

    it('returns null & removes the coin when it is expired', () => {
      set(
        'expiredCoin',
        { name: 'expiredCoin', metadata: { persist: { cacheTime: Date.now() - 1000000 } } },
        banditTeasureTrove
      );

      return retrieveCoin('expiredCoin').then(coin => {
        expect(coin).toBeFalsy();
        expect(get('expiredCoin', banditTeasureTrove)).resolves.toBeFalsy();
      });
    });

    it('retrieves a coin properly', () => {
      set('testCoin', { name: 'testCoin', metadata: { persist: {} } }, banditTeasureTrove);

      return expect(retrieveCoin('testCoin')).resolves.toEqual({
        name: 'testCoin',
        metadata: { persist: {} }
      });
    });
  });

  describe('cacheCoin tests', () => {
    afterEach(() => {
      clear(banditTeasureTrove);
    });

    it('returns false if the coin should be updated', () => {
      set(
        'existingCoin',
        { name: 'existingCoin', metadata: { persist: { version: 1 } } },
        banditTeasureTrove
      );

      return expect(
        cacheCoin({ name: 'existingCoin', metadata: { persist: { version: 1 } } })
      ).resolves.toBeFalsy();
    });

    it('caches a new coin forever when no time is specified', () =>
      cacheCoin({ name: 'infiniteCoin', metadata: { persist: {} } }).then(response => {
        expect(response).toBeTruthy();

        return expect(get('infiniteCoin', banditTeasureTrove)).resolves.toEqual({
          name: 'infiniteCoin',
          metadata: {
            persist: {
              expirationTime: Infinity,
              cacheTime: Infinity,
              timeStored: expect.anything(),
              version: null
            }
          }
        });
      }));

    it('caches a new coin for a set amount of time', () =>
      cacheCoin({ name: 'timedCoin', metadata: { persist: { cacheTime: 100000 } } }).then(
        response => {
          expect(response).toBeTruthy();

          return expect(get('timedCoin', banditTeasureTrove)).resolves.toEqual({
            name: 'timedCoin',
            metadata: {
              persist: {
                expirationTime: expect.anything(),
                cacheTime: 100000,
                timeStored: expect.anything(),
                version: null
              }
            }
          });
        }
      ));

    it('caches a coin if there is a version update', () => {
      set(
        'versionedCoin',
        { name: 'versionedCoin', metadata: { persist: { version: 1 } } },
        banditTeasureTrove
      );

      return cacheCoin({ name: 'versionedCoin', metadata: { persist: { version: 2 } } }).then(
        response => {
          expect(response).toBeTruthy();

          return expect(get('versionedCoin', banditTeasureTrove)).resolves.toEqual({
            name: 'versionedCoin',
            metadata: {
              persist: {
                expirationTime: Infinity,
                cacheTime: Infinity,
                timeStored: expect.anything(),
                version: 2
              }
            }
          });
        }
      );
    });

    it('caches a coin if a force update is requested', () => {
      set(
        'forcedCoin',
        { name: 'forcedCoin', metadata: { persist: { version: 1 } } },
        banditTeasureTrove
      );

      return cacheCoin(
        { name: 'forcedCoin', metadata: { forceAdittion: true, persist: { version: 1 } } },
        true
      ).then(response => {
        expect(response).toBeTruthy();

        return expect(get('forcedCoin', banditTeasureTrove)).resolves.toEqual({
          name: 'forcedCoin',
          metadata: {
            forceAdittion: true,
            persist: {
              expirationTime: Infinity,
              cacheTime: Infinity,
              timeStored: expect.anything(),
              version: 1
            }
          }
        });
      });
    });
  });
});
