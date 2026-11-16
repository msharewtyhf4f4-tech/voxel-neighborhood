// Coins picked up in the sim, waiting to be checked and saved by the server.
export type CoinPick = { x: number; z: number };

const queue: CoinPick[] = [];

export const queueCoinPicks = (picks: CoinPick[]) => {
  queue.push(...picks);
};

export const takeCoinPicks = (max: number) => queue.splice(0, max);

/** Put picks back at the front (e.g. after a network error). */
export const returnCoinPicks = (picks: CoinPick[]) => {
  queue.unshift(...picks);
};

export const clearCoinPicks = () => {
  queue.length = 0;
};
