export type DiceSystem = {
  system: string;
  name: string;
};

export type BcdiceVersionInfo = {
  api: string;
  bcdice: string;
};

export type BcdiceSystemInfo = {
  name: string;
  gameType: string;
  prefixs: string[];
  info: string;
};

export type DiceResult = {
  faces: number;
  value: number;
};

export type BcdiceDiceRollInfo = {
  ok: string;
  result?: string;
  secret?: boolean;
  dices?: DiceResult[];
};
