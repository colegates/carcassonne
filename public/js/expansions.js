// Expansion catalogue shown on the setup screen.
export const EXPANSIONS = [
  { id: 'river', name: 'The River', icon: '🌊', blurb: 'Start the map with a winding river from spring to lake.', ready: false },
  { id: 'abbot', name: 'The Abbot', icon: '🧑‍🌾', blurb: 'An abbot for gardens & monasteries, who can come home early with points.', ready: false },
  { id: 'inns', name: 'Inns & Cathedrals', icon: '🍺', blurb: 'Inns double roads, cathedrals triple cities, plus a big meeple and a 6th player.', ready: false },
  { id: 'traders', name: 'Traders & Builders', icon: '🔨', blurb: 'Trade goods, a builder for double turns and a pig for richer farms.', ready: false },
  { id: 'dragon', name: 'The Princess & the Dragon', icon: '🐉', blurb: 'A dragon that eats meeples, a protective fairy, magic portals and princesses.', ready: false },
  { id: 'tower', name: 'The Tower', icon: '🏰', blurb: 'Build towers to capture other players’ meeples and hold them for ransom.', ready: false },
];

export const expansionName = (id) => EXPANSIONS.find((e) => e.id === id)?.name || id;
export const maxPlayers = (exp = {}) => (exp.inns ? 6 : 5);
