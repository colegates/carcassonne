import * as A from './assets.js';
// Real sizes of the miniature sprites, as a fraction of a tile edge (a tile is about 48 m of
// countryside, so a person of 1.7 m is 0.035). `w` = width of the trimmed sprite, `h` = height;
// the other dimension follows the sprite's own aspect. `walk`: a figure that walks (sheet
// figures face left, so they are mirrored to walk right).
export const CAT = {
  // P02 town houses
  house_shop_gable: { w: 0.105 }, house_shop_eaves: { w: 0.15 }, house_merchant_stone: { w: 0.13 }, row_houses: { w: 0.2 },
  house_courtyard: { w: 0.16 }, cottage_small: { w: 0.095 }, village_house_tall: { w: 0.095 }, bakehouse: { w: 0.12 }, smithy: { w: 0.12 },
  // P03 walls and gates
  tower_roman_round: { w: 0.12 }, tower_round_hoarding: { w: 0.13 }, tower_square_watch: { w: 0.1 }, turret_small: { w: 0.085 },
  gatehouse_outer: { w: 0.17 }, gatehouse_inner: { w: 0.17 }, gatehouse_side: { w: 0.15 },
  wall_outer: { w: 0.2 }, wall_inner: { w: 0.2 }, hoarding_segment: { w: 0.15 }, wall_stair_postern: { w: 0.08 }, merlon_set: { w: 0.08 },
  treadwheel_crane: { w: 0.13 }, mason: { h: 0.036, walk: true }, carpenter: { w: 0.07 }, handbarrow_labourers: { w: 0.06, walk: true },
  // P04 townsfolk and clergy
  townsman: { h: 0.036, walk: true }, townswoman: { h: 0.035, walk: true }, boy_running: { h: 0.027, walk: true }, girl_hoop: { h: 0.027, walk: true },
  pilgrim: { h: 0.037, walk: true }, princess: { h: 0.037, walk: true }, merchant: { h: 0.036, walk: true }, noble_lady: { h: 0.036, walk: true },
  benedictine_monk: { h: 0.036, walk: true }, water_carrier: { h: 0.035, walk: true }, old_woman_spinning: { h: 0.033, walk: true },
  nobleman_falcon: { h: 0.037, walk: true }, dominican_friar: { h: 0.036, walk: true }, nun: { h: 0.035, walk: true }, bishop: { h: 0.039, walk: true }, canon: { h: 0.04, walk: true },
  // P05 field folk and animals
  ploughman_oxen_ard: { w: 0.11, walk: true }, sheep_group: { w: 0.04, walk: true }, shepherd: { h: 0.037, walk: true }, hay_cart: { w: 0.085, walk: true },
  mule_packed: { w: 0.045, walk: true }, reaper: { h: 0.03 }, pig_running: { w: 0.026, walk: true }, chickens: { w: 0.03 }, palfrey_rider: { h: 0.052, walk: true },
  sower: { h: 0.036, walk: true }, sheaf_binder: { h: 0.032 }, guard_dog: { w: 0.024, walk: true }, goose_girl: { w: 0.05, walk: true }, goats: { w: 0.036, walk: true },
  sow_piglets: { w: 0.038, walk: true }, donkey_rider: { h: 0.046, walk: true },
  // P06 soldiers and siege
  sergeant_spear: { h: 0.04, walk: true }, crossbowman_shooting: { h: 0.036 }, crossbowman_spanning: { h: 0.034 }, rope_haulers: { w: 0.05 },
  pierriere_frame: { w: 0.085 }, pierriere_arm: { w: 0.13, flat: true }, straw_target: { w: 0.032 }, knight_mounted: { h: 0.058, walk: true },
  banner_bearer: { h: 0.05, walk: true }, horn_watchman: { h: 0.036 }, archer: { h: 0.036 }, engineer: { h: 0.036 },
  trabuquet_frame: { w: 0.14 }, trabuquet_arm: { w: 0.2, flat: true }, knight_foot: { h: 0.038, walk: true }, quintain: { w: 0.04 },
  // P07 trees and plants
  holm_oak: { h: 0.13 }, downy_oak: { h: 0.15 }, black_poplar: { h: 0.2 }, pollard_willow: { h: 0.11 }, goblet_vine: { h: 0.034 }, olive: { h: 0.1 },
  apple_tree: { h: 0.11 }, hedge_segment: { w: 0.12 }, reed_clump: { h: 0.05 }, white_poplar: { h: 0.19 }, cypress: { h: 0.17 }, almond: { h: 0.1 },
  fig: { h: 0.08 }, walnut: { h: 0.15 }, broom: { h: 0.04 }, garrigue_clump: { w: 0.06 },
  // P08 landmarks
  parish_church: { w: 0.25 }, cathedral: { w: 0.46 }, inn: { w: 0.2 }, farmhouse: { w: 0.25 }, castle: { w: 0.3 }, village_well: { w: 0.06 },
  wayside_cross: { w: 0.045 }, threshing_floor: { w: 0.11 }, highwaymen: { w: 0.1 },
  // P09 monastery and garden
  monastery_complex: { w: 0.44 }, priory_small: { w: 0.32 }, herb_garden: { w: 0.22 }, bee_bench: { w: 0.07 }, fishpond: { w: 0.14 },
  monk_hoeing: { h: 0.035 }, lay_brother_beekeeper: { h: 0.035 }, bell: { w: 0.022, flat: true }, orchard_cluster: { w: 0.17 },
  // P10 market and trades
  wine_stall: { w: 0.075 }, cloth_stall: { w: 0.075 }, grain_stall: { w: 0.06 }, juggler: { h: 0.036 }, bear_leader: { w: 0.05 }, minstrel: { h: 0.035 },
  money_changer: { w: 0.05 }, blacksmith_up: { h: 0.036 }, blacksmith_down: { h: 0.036 }, pottery_stall: { w: 0.06 }, woad_stall: { w: 0.055 },
  spice_salt_stall: { w: 0.05 }, poultry_produce: { w: 0.055 }, cooper: { h: 0.034 }, fishwife: { h: 0.035, walk: true }, tumbler: { h: 0.034 },
  // P11 river, mill and bridges
  mill_house: { w: 0.18 }, mill_wheel: { w: 0.07, flat: true }, bridge_lr: { w: 0.3 }, bridge_front: { w: 0.14 }, angler: { w: 0.04 },
  washerwomen: { w: 0.065 }, ducks: { w: 0.04, walk: true }, punt_fishermen: { w: 0.085, walk: true }, dyer: { w: 0.07 }, footbridge: { w: 0.14 },
  ferry: { w: 0.085, walk: true }, fish_traps: { w: 0.06 }, heron: { h: 0.04 }, children_wading: { w: 0.05 }, laundry_drying: { w: 0.08 }, water_life: { w: 0.03 },
  // P12 fantasy and tower
  dragon_wings_up: { w: 0.5 }, dragon_wings_down: { w: 0.5 }, fairy: { h: 0.05 }, volcano: { w: 0.32 }, dolmen_portal: { w: 0.16 }, fairy_ring: { w: 0.1 },
  tower_base: { w: 0.15 }, tower_floor: { w: 0.15 }, tower_top: { w: 0.16 },
  // P14 life details
  stork_wings_up: { w: 0.055 }, stork_wings_down: { w: 0.055 }, stork_nest: { w: 0.05 }, doves: { w: 0.04 }, cat_sitting: { h: 0.016 }, cat_stalking: { w: 0.022, walk: true },
  hound_running: { w: 0.032, walk: true }, sparrows_mouse: { w: 0.02 }, banner_france: { w: 0.03, flat: true }, banner_toulouse: { w: 0.03, flat: true },
  banner_trencavel: { w: 0.03, flat: true }, banner_foix: { w: 0.03, flat: true }, pennons: { w: 0.04, flat: true }, laundry_pieces: { w: 0.05, flat: true },
  butterflies_bee: { w: 0.015 }, props: { w: 0.045 },
  // P15 banners and life
  banner_pole_france: { h: 0.042 }, banner_pole_toulouse: { h: 0.042 }, banner_pole_trencavel: { h: 0.042 }, banner_pole_foix: { h: 0.042 },
  bell_frame: { w: 0.034, flat: true }, ducklings: { w: 0.05, walk: true }, duck_dabbling: { w: 0.011 },
  sentry_sleeping: { h: 0.031 }, sentry_angry: { h: 0.037 }, cat_bread: { w: 0.019 }, capstan_a: { w: 0.07 }, capstan_b: { w: 0.064 },
  wine_cart: { w: 0.08, walk: true }, grain_cart: { w: 0.078, walk: true }, cloth_packhorse: { w: 0.066, walk: true }, knight_peeking: { w: 0.036 },
  // P16 vignettes
  heron_strike: { h: 0.04 }, inn_toast_a: { w: 0.05 }, inn_toast_b: { w: 0.049 }, women_chatting: { w: 0.04 }, children_knucklebones: { w: 0.036 },
  hermit_sweeping: { h: 0.034 }, onlookers_pointing: { w: 0.04 }, lily_pads: { w: 0.045, flat: true }, pilgrim_kneeling: { w: 0.03 },
  baker_boy: { h: 0.03, walk: true }, frog: { w: 0.006 }, lizard_stone: { w: 0.016 }, dragonflies: { w: 0.024 }, monk_reading: { w: 0.034 }, porter_bread: { w: 0.045 },
};

// Width and height (tile units) of a sprite from its catalogue size and pixel aspect.
export function sizeOf(id, info, scale = 1) {
  // a second walking pose ('townsman_b') is drawn at exactly the first pose's pixel scale
  if (!CAT[id] && id.endsWith('_b') && CAT[id.slice(0, -2)] && info) {
    const base = id.slice(0, -2), bi = A.spriteInfo(base);
    if (bi) { const [bw] = sizeOf(base, bi, scale); const k = bw / bi.w; return [info.w * k, info.h * k]; }
  }
  const c = CAT[id] || { h: 0.05 };
  const asp = info ? info.h / info.w : 1;
  if (c.w) return [c.w * scale, c.w * asp * scale];
  return [(c.h / asp) * scale, c.h * scale];
}

// Groups the scene picks from (first available wins for `pickFirst`, otherwise varied).
export const GROUPS = {
  houses: ['house_shop_gable', 'house_shop_eaves', 'house_merchant_stone', 'row_houses', 'house_courtyard'],
  smallHouses: ['house_shop_gable', 'cottage_small', 'village_house_tall', 'house_shop_eaves'],
  village: ['village_house_tall', 'cottage_small', 'house_shop_gable'],
  towers: ['tower_roman_round', 'tower_round_hoarding', 'tower_roman_round', 'turret_small'],
  trees: ['holm_oak', 'downy_oak', 'walnut', 'olive', 'almond', 'fig', 'apple_tree', 'holm_oak', 'downy_oak'],
  riverTrees: ['black_poplar', 'white_poplar', 'pollard_willow', 'pollard_willow'],
  bushes: ['broom', 'garrigue_clump', 'broom'],
  stalls: ['wine_stall', 'cloth_stall', 'grain_stall', 'pottery_stall', 'woad_stall', 'spice_salt_stall', 'poultry_produce', 'money_changer'],
  townsfolk: ['townsman', 'townswoman', 'merchant', 'water_carrier', 'old_woman_spinning', 'boy_running', 'girl_hoop', 'noble_lady', 'townsman', 'townswoman', 'fishwife', 'mason', 'baker_boy', 'benedictine_monk'],
  travellers: ['pilgrim', 'townsman', 'mule_packed', 'hay_cart', 'merchant', 'donkey_rider', 'palfrey_rider', 'pilgrim', 'knight_mounted', 'dominican_friar', 'townswoman', 'sergeant_spear'],
  clergy: ['benedictine_monk', 'dominican_friar', 'nun', 'canon', 'benedictine_monk'],
  soldiers: ['sergeant_spear', 'sergeant_spear', 'crossbowman_shooting', 'horn_watchman', 'archer'],
  fieldFolk: ['reaper', 'sheaf_binder', 'sower'],
};
// Stand-ins for a missing sprite: try these in order.
export const ALT = {
  gatehouse_outer: ['gatehouse_side', 'gatehouse_inner', 'tower_square_watch', 'tower_roman_round', 'tower_round_hoarding'],
  gatehouse_inner: ['gatehouse_outer', 'gatehouse_side', 'tower_square_watch', 'tower_roman_round', 'tower_round_hoarding'],
  gatehouse_side: ['gatehouse_outer', 'gatehouse_inner', 'tower_square_watch', 'tower_roman_round', 'tower_round_hoarding'],
  tower_roman_round: ['tower_round_hoarding', 'turret_small', 'tower_square_watch'],
  tower_round_hoarding: ['tower_roman_round', 'turret_small', 'tower_square_watch'],
  turret_small: ['tower_roman_round', 'tower_round_hoarding'],
  tower_square_watch: ['tower_roman_round', 'tower_round_hoarding'],
  cathedral: ['parish_church', 'monastery_complex'],
  parish_church: ['priory_small', 'house_merchant_stone'],
  monastery_complex: ['priory_small', 'parish_church'],
  priory_small: ['monastery_complex', 'parish_church'],
  inn: ['house_courtyard', 'house_shop_eaves', 'house_shop_gable'],
  farmhouse: ['village_house_tall', 'cottage_small', 'house_shop_eaves'],
  cottage_small: ['village_house_tall', 'house_shop_gable', 'house_shop_eaves'],
  village_house_tall: ['cottage_small', 'house_shop_gable'],
  bakehouse: ['cottage_small', 'house_shop_gable'],
  smithy: ['cottage_small', 'house_shop_eaves'],
  herb_garden: ['orchard_cluster'],
  townsman: ['townswoman', 'merchant', 'pilgrim', 'benedictine_monk'],
  townswoman: ['townsman', 'noble_lady', 'nun'],
  pilgrim: ['townsman', 'dominican_friar', 'benedictine_monk'],
  benedictine_monk: ['dominican_friar', 'nun', 'canon', 'townsman'],
  monk_hoeing: ['benedictine_monk', 'lay_brother_beekeeper'],
  sergeant_spear: ['crossbowman_shooting', 'archer', 'knight_foot', 'townsman'],
  crossbowman_spanning: ['crossbowman_shooting', 'archer'],
  crossbowman_shooting: ['archer', 'crossbowman_spanning', 'sergeant_spear'],
  hay_cart: ['mule_packed', 'donkey_rider'],
  wine_stall: ['cloth_stall', 'grain_stall', 'pottery_stall'],
  holm_oak: ['downy_oak', 'walnut', 'olive'],
  volcano: [],
};
