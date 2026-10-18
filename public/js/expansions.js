// Expansion catalogue shown on the setup screen.
export const EXPANSIONS = [
  { id: 'river', name: 'The River', icon: '🌊', blurb: 'Start the map with a winding river from spring to lake.', ready: true },
  { id: 'abbot', name: 'The Abbot', icon: '⛪', blurb: 'An abbot for gardens & monasteries, who can come home early with points.', ready: true },
  { id: 'inns', name: 'Inns & Cathedrals', icon: '🍺', blurb: 'Inns make roads worth 2 a tile, cathedrals make cities worth 3 a tile (but 0 if unfinished!), plus a big meeple and a 6th player.', ready: true },
  { id: 'traders', name: 'Traders & Builders', icon: '🔨', blurb: 'Trade goods, a builder for double turns and a pig for richer farms.', ready: true },
  { id: 'dragon', name: 'The Princess & the Dragon', icon: '🐉', blurb: 'A dragon that eats meeples, a protective fairy, magic portals and princesses.', ready: true },
  { id: 'tower', name: 'The Tower', icon: '🏰', blurb: 'Build towers to capture other players’ meeples and hold them for ransom.', ready: true },
  { id: 'bridges', name: 'Bridges, Castles & Bazaars', icon: '🌉', blurb: 'Bridges carry roads over anything, tiny cities become castles that score their neighbours, and bazaars auction tiles.', ready: true,
    // parts that can be switched off (options.bcb)
    parts: [['bridges', '🌉 Bridges'], ['castles', '🏰 Castles'], ['bazaars', '🛒 Bazaars'], ['auction', '💰 Bidding']] },
];

export const expansionName = (id) => EXPANSIONS.find((e) => e.id === id)?.name || id;
export const maxPlayers = (exp = {}) => (exp.inns ? 6 : 5);
