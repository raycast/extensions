export type CardSet = {
  set_name: string;
  set_code: string;
  set_rarity: string;
  set_rarity_code: string;
  set_price: string;
};

export type CardPrice = {
  cardmarket_price: string;
  tcgplayer_price: string;
  ebay_price: string;
  amazon_price: string;
  coolstuffinc_price: string;
};

export interface Card {
  id: string;
  name: string;
  type: string;
  humanReadableCardType: string;
  frameType: string;
  desc: string;
  archetype: string;
  ygoprodeck_url: string;
  card_sets?: CardSet[];
  card_prices?: CardPrice[];
}

export interface MonsterCard extends Card {
  typeline: string[];
  atk: number;
  def: number;
  level: number;
  attribute: string;
}

export interface PendulumCard extends MonsterCard {
  pend_desc: string;
  monster_desc: string;
  scale: number;
}

export interface LinkCard extends Card {
  typeline: string[];
  atk: number;
  attribute: string;
  linkval: number;
  linkmarkers: string[];
}

export interface SpellTrapCard extends Card {
  race: string;
}
