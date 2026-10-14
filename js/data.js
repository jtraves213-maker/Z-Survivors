// Game content: techniques, passives, fighters, sagas.
// Every tech has max level 6; stats(lv) returns the numbers for that level.
window.ZS_DATA = (() => {
  const at = (arr, lv) => arr[Math.min(lv, arr.length) - 1];

  const TECHS = {
    // ---- Goku
    kamehameha: { name: 'Kamehameha', type: 'beam', color: '#3fb8ff', core: '#e6fbff',
      info: 'A sustained wave of ki aimed at the nearest enemy.',
      stats: lv => ({ dmg: 5 + 2 * (lv - 1), cd: 2.4 - 0.2 * (lv - 1), dur: 0.7 + 0.08 * (lv - 1), len: 140 + 16 * (lv - 1), width: 6 + 1.2 * (lv - 1) }) },
    ki_blast: { name: 'Ki Blast', type: 'shot', color: '#ffd86a', core: '#fffbe0',
      info: 'Quick balls of ki fired at nearby enemies.',
      stats: lv => ({ dmg: 6 + 2 * (lv - 1), cd: 1.0 - 0.07 * (lv - 1), count: at([1, 1, 2, 2, 3, 4], lv), pierce: at([1, 1, 1, 2, 2, 3], lv), speed: 190, size: 3, spread: 0.18 }) },
    kaioken: { name: 'Kaioken', type: 'aura', color: '#ff3030',
      labels: ['x2', 'x3', 'x4', 'x10', 'x20', 'x20 Max'],
      info: 'A red aura that burns nearby enemies and multiplies your power.',
      stats: lv => ({ dmg: 3 + 1.6 * (lv - 1), radius: 26 + 4 * (lv - 1), might: 0.05 * lv }) },
    instant_transmission: { name: 'Instant Transmission', type: 'strike', color: '#ffffff',
      info: 'Teleport to enemies on screen and strike them.',
      stats: lv => ({ dmg: 14 + 5 * (lv - 1), cd: 3 - 0.25 * (lv - 1), count: 2 + (lv - 1) }) },
    spirit_bomb: { name: 'Spirit Bomb', type: 'bomb', color: '#7ad0ff', core: '#ffffff',
      info: 'Gather energy overhead, then hurl it into the thickest crowd.',
      stats: lv => ({ dmg: 70 + 28 * (lv - 1), cd: 12 - 1 * (lv - 1), radius: 60 + 10 * (lv - 1), size: 7 + lv, charge: 1.2, speed: 110 }) },
    dragon_fist: { name: 'Dragon Fist', type: 'dragon', color: '#ffcc33', core: '#fff4b0',
      info: 'A golden dragon of ki tears through everything in its path.',
      stats: lv => ({ dmg: 45 + 18 * (lv - 1), cd: 6 - 0.5 * (lv - 1), speed: 260, size: 9, life: 1.1 + 0.1 * (lv - 1) }) },

    // ---- Gohan
    masenko: { name: 'Masenko', type: 'beam', color: '#ffe24a', core: '#fffbe0',
      info: 'A short, fast overhead wave.',
      stats: lv => ({ dmg: 4 + 1.6 * (lv - 1), cd: 1.8 - 0.14 * (lv - 1), dur: 0.5 + 0.05 * (lv - 1), len: 110 + 12 * (lv - 1), width: 5 + 1 * (lv - 1) }) },
    hidden_power: { name: 'Hidden Power', type: 'nova', color: '#ffffff',
      info: 'Rage bursts out of you, blasting everything nearby.',
      stats: lv => ({ dmg: 10 + 4 * (lv - 1), cd: 5 - 0.4 * (lv - 1), radius: 50 + 8 * (lv - 1) }) },
    ultimate_rush: { name: 'Ultimate Rush', type: 'strike', color: '#ffe24a',
      info: 'A blur of strikes across every enemy on screen.',
      stats: lv => ({ dmg: 12 + 4 * (lv - 1), cd: 2.6 - 0.2 * (lv - 1), count: at([3, 4, 5, 6, 7, 8], lv) }) },
    father_son: { name: 'Father-Son Kamehameha', type: 'beam', color: '#5ad0ff', core: '#ffffff',
      info: 'A massive wave backed by your father\'s spirit.',
      stats: lv => ({ dmg: 14 + 5 * (lv - 1), cd: 7 - 0.5 * (lv - 1), dur: 1.3 + 0.1 * (lv - 1), len: 240 + 20 * (lv - 1), width: 14 + 2.5 * (lv - 1) }) },
    special_beam_cannon: { name: 'Special Beam Cannon', type: 'beam', style: 'drill', tick: 0.08, color: '#ffe24a', core: '#fffbe0', spiral: '#c040ff',
      info: 'A drilling beam that pierces in a long line.',
      stats: lv => ({ dmg: 20 + 9 * (lv - 1), cd: 3.6 - 0.3 * (lv - 1), dur: 0.35, len: 220 + 25 * (lv - 1), width: 3 + 0.4 * (lv - 1) }) },

    // ---- Vegeta
    galick_gun: { name: 'Galick Gun', type: 'beam', color: '#b05aff', core: '#f4e0ff',
      info: 'A violet wave fired at the nearest enemy.',
      stats: lv => ({ dmg: 6 + 2.2 * (lv - 1), cd: 2.6 - 0.2 * (lv - 1), dur: 0.7 + 0.08 * (lv - 1), len: 140 + 16 * (lv - 1), width: 6 + 1.2 * (lv - 1) }) },
    barrage: { name: 'Energy Barrage', type: 'shot', color: '#ffd040', core: '#fff6c0',
      info: 'A rapid spray of ki blasts.',
      stats: lv => ({ dmg: 3 + 1.2 * (lv - 1), cd: 1.6 - 0.1 * (lv - 1), count: 6 + 2 * (lv - 1), pierce: 1, speed: 200, size: 2.5, spread: 0.9, burst: 0.4 }) },
    big_bang: { name: 'Big Bang Attack', type: 'bomb', color: '#9adcff', core: '#ffffff',
      info: 'A palm-thrust orb that detonates in a wide blast.',
      stats: lv => ({ dmg: 25 + 10 * (lv - 1), cd: 3.5 - 0.25 * (lv - 1), radius: 32 + 5 * (lv - 1), size: 5, charge: 0, speed: 220 }) },
    final_flash: { name: 'Final Flash', type: 'beam', color: '#fff07a', core: '#ffffff',
      info: 'An enormous golden wave.',
      stats: lv => ({ dmg: 14 + 5 * (lv - 1), cd: 7 - 0.6 * (lv - 1), dur: 1.4 + 0.1 * (lv - 1), len: 260 + 20 * (lv - 1), width: 14 + 2.5 * (lv - 1) }) },
    final_explosion: { name: 'Final Explosion', type: 'nova', color: '#ffe88a', flash: true,
      info: 'Pour everything into one devastating blast.',
      stats: lv => ({ dmg: 40 + 16 * (lv - 1), cd: 14 - 1.2 * (lv - 1), radius: 110 + 15 * (lv - 1) }) },
    hakai: { name: 'Hakai', type: 'erase', color: '#b04aff',
      info: 'Destruction. Erases enemies outright and wounds bosses.',
      stats: lv => ({ dmg: 80 + 40 * (lv - 1), cd: 6 - 0.5 * (lv - 1), count: at([1, 2, 2, 3, 3, 4], lv) }) },

    // ---- Piccolo
    eye_laser: { name: 'Eye Laser', type: 'shot', style: 'laser', color: '#ff6ad8', core: '#ffe0f6',
      info: 'Twin piercing lasers.',
      stats: lv => ({ dmg: 7 + 2.5 * (lv - 1), cd: 0.9 - 0.06 * (lv - 1), count: at([2, 2, 2, 3, 3, 4], lv), pierce: at([1, 2, 2, 2, 3, 3], lv), speed: 300, size: 2, spread: 0.06 }) },
    explosive_demon_wave: { name: 'Explosive Demon Wave', type: 'beam', color: '#ffb0f0', core: '#fff0ff',
      info: 'A wide wave from both palms.',
      stats: lv => ({ dmg: 9 + 3 * (lv - 1), cd: 5 - 0.4 * (lv - 1), dur: 0.9, len: 180 + 15 * (lv - 1), width: 10 + 2 * (lv - 1) }) },
    hellzone_grenade: { name: 'Hellzone Grenade', type: 'hellzone', color: '#ffe24a', core: '#fffbe0',
      info: 'Orbs surround a target, then slam shut.',
      stats: lv => ({ dmg: 10 + 4 * (lv - 1), cd: 5 - 0.4 * (lv - 1), count: 6 + 2 * (lv - 1), radius: 18 }) },
    light_grenade: { name: 'Light Grenade', type: 'bomb', color: '#ffe24a', core: '#fffbe0',
      info: 'A charged sphere that bursts in a bright blast.',
      stats: lv => ({ dmg: 30 + 12 * (lv - 1), cd: 4 - 0.3 * (lv - 1), radius: 40 + 6 * (lv - 1), size: 5, charge: 0.3, speed: 180 }) },
    multiform: { name: 'Multi-Form', type: 'clones', color: '#56b048',
      info: 'Split into copies that fight beside you.',
      stats: lv => ({ dmg: 8 + 3 * (lv - 1), cd: 1.2 - 0.08 * (lv - 1), count: at([1, 2, 2, 3, 3, 4], lv) }) },
  };

  const PASSIVES = {
    gravity:    { name: 'Gravity Training', max: 5, info: '+10% damage' },
    weights:    { name: 'Weighted Clothing', max: 5, info: '+8% move speed' },
    kicontrol:  { name: 'Ki Control', max: 5, info: '-7% technique cooldown' },
    scouter:    { name: 'Scouter', max: 5, info: '+35% pickup range' },
    armor:      { name: 'Battle Armor', max: 5, info: '+1 armor' },
    zenkai:     { name: 'Zenkai Boost', max: 5, info: '+20 max HP' },
    divine:     { name: 'Ultra Divine Water', max: 5, info: '+10% area and range' },
    afterimage: { name: 'Afterimage', max: 5, info: '+5% chance to dodge' },
    turtle:     { name: 'Turtle School Training', max: 5, info: '+12% experience' },
  };

  const CHARS = {
    goku: {
      name: 'Goku', title: 'Raised on Earth', hp: 110, speed: 64, start: 'kamehameha',
      perk: 'Zenkai: survive one fatal blow at half HP.',
      techs: [['kamehameha', 1], ['ki_blast', 1], ['kaioken', 4], ['instant_transmission', 10], ['spirit_bomb', 18], ['dragon_fist', 28]],
      forms: [
        { name: 'Base', short: 'Base', lv: 1, sprite: 'hd/goku', power: 1 },
        { name: 'Super Saiyan', short: 'SSJ', lv: 8, sprite: 'hd/goku_ssj', power: 1.5, aura: '#ffd83a' },
        { name: 'Super Saiyan 2', short: 'SSJ2', lv: 16, sprite: 'hd/goku_ssj2', power: 2.1, aura: '#fff07a', sparks: true },
        { name: 'Super Saiyan 3', short: 'SSJ3', lv: 26, sprite: 'hd/goku_ssj3', power: 2.8, aura: '#ffd83a', sparks: true },
        { name: 'Super Saiyan God', short: 'God', lv: 38, sprite: 'hd/goku_god', power: 3.8, aura: '#ff5a3a' },
        { name: 'Super Saiyan Blue', short: 'Blue', lv: 50, sprite: 'hd/goku_blue', power: 5, aura: '#40c8ff' },
        { name: 'Ultra Instinct', short: 'UI', lv: 64, sprite: 'hd/goku_ui', power: 6.5, aura: '#d4dcff', dodge: 0.2 },
      ],
    },
    gohan: {
      name: 'Gohan', title: 'Hidden potential', hp: 105, speed: 64, start: 'masenko',
      perk: 'Rage: up to +40% damage as your HP drops.',
      techs: [['masenko', 1], ['ki_blast', 1], ['hidden_power', 5], ['ultimate_rush', 12], ['father_son', 20], ['special_beam_cannon', 36]],
      forms: [
        { name: 'Base', short: 'Base', lv: 1, sprite: 'hd/gohan', power: 1 },
        { name: 'Super Saiyan', short: 'SSJ', lv: 8, sprite: 'hd/gohan_ssj', power: 1.5, aura: '#ffd83a' },
        { name: 'Super Saiyan 2', short: 'SSJ2', lv: 16, sprite: 'hd/gohan_ssj2', power: 2.2, aura: '#fff07a', sparks: true },
        { name: 'Ultimate', short: 'Ultimate', lv: 30, sprite: 'hd/gohan_ult', power: 3.3, aura: '#ffffff' },
        { name: 'Beast', short: 'Beast', lv: 52, sprite: 'hd/gohan_beast', power: 5.8, aura: '#d050ff', sparks: true },
      ],
    },
    vegeta: {
      name: 'Vegeta', title: 'Prince of all Saiyans', hp: 95, speed: 66, start: 'galick_gun', might: 1.15,
      perk: 'Saiyan Pride: +15% damage, lower max HP.',
      techs: [['galick_gun', 1], ['barrage', 1], ['big_bang', 6], ['final_flash', 14], ['final_explosion', 24], ['hakai', 40]],
      forms: [
        { name: 'Base', short: 'Base', lv: 1, sprite: 'hd/vegeta', power: 1 },
        { name: 'Super Saiyan', short: 'SSJ', lv: 8, sprite: 'hd/vegeta_ssj', power: 1.5, aura: '#ffd83a' },
        { name: 'Super Vegeta', short: 'Super', lv: 16, sprite: 'hd/vegeta_ssj', power: 2.0, aura: '#ffc21a' },
        { name: 'Majin Vegeta', short: 'Majin', lv: 26, sprite: 'hd/vegeta_ssj2', power: 2.7, aura: '#fff07a', sparks: true },
        { name: 'Super Saiyan Blue', short: 'Blue', lv: 40, sprite: 'hd/vegeta_blue', power: 4.2, aura: '#40c8ff' },
        { name: 'Ultra Ego', short: 'Ultra Ego', lv: 56, sprite: 'hd/vegeta_ue', power: 6, aura: '#a04aff', sparks: true },
      ],
    },
    piccolo: {
      name: 'Piccolo', title: 'Namekian warrior', hp: 125, speed: 60, start: 'eye_laser', regen: 0.01,
      perk: 'Regeneration: recover 1% HP every second.',
      techs: [['eye_laser', 1], ['special_beam_cannon', 3], ['explosive_demon_wave', 8], ['hellzone_grenade', 13], ['light_grenade', 20], ['multiform', 28]],
      forms: [
        { name: 'Base', short: 'Base', lv: 1, sprite: 'hd/piccolo', power: 1 },
        { name: 'Fused with Nail', short: 'Nail', lv: 8, sprite: 'hd/piccolo', power: 1.5, aura: '#9af07a' },
        { name: 'Fused with Kami', short: 'Kami', lv: 16, sprite: 'hd/piccolo', power: 2.2, aura: '#ffffff' },
        { name: 'Power Awakening', short: 'Awakened', lv: 32, sprite: 'hd/piccolo', power: 3.4, aura: '#ffffff', sparks: true },
        { name: 'Orange Piccolo', short: 'Orange', lv: 52, sprite: 'hd/piccolo_orange', power: 5.8, aura: '#ff8a2a', scale: 1.25 },
      ],
    },
  };

  // Grunt archetypes; numbers are multipliers on the saga's base stats.
  const GRUNT_TYPES = {
    normal:   { hp: 1, spd: 1, dmg: 1, r: 6, xp: 1 },
    fast:     { hp: 0.6, spd: 1.6, dmg: 0.8, r: 5, xp: 1 },
    tank:     { hp: 3.5, spd: 0.65, dmg: 1.5, r: 8, xp: 3, scale: 1.3 },
    shooter:  { hp: 1, spd: 0.8, dmg: 0.9, r: 6, xp: 1.5, shoots: true },
    exploder: { hp: 0.7, spd: 1.35, dmg: 1.8, r: 6, xp: 1, explodes: true },
  };

  const SAGAS = [
    { name: 'Red Ribbon Army', era: 'Dragon Ball', biome: 'plains',
      grunts: [['rr_soldier', 'normal', 3], ['rr_soldier_b', 'shooter', 1]],
      boss: { s: 'tao', name: 'Mercenary Tao', scale: 2, color: '#ff7ad0', moves: { dash: 'Pillar Dash', aimed: 'Dodon Ray' } } },
    { name: 'King Piccolo', era: 'Dragon Ball', biome: 'waste',
      grunts: [['demon', 'normal', 3], ['demon_b', 'fast', 2]],
      boss: { s: 'king_piccolo', name: 'King Piccolo', scale: 2.2, color: '#ff5050', moves: { ring: 'Shockwave', aimed: 'Mouth Blast', beam: 'Explosive Demon Wave' } } },
    { name: 'Saiyan Invasion', era: 'Dragon Ball Z', biome: 'rocky',
      grunts: [['saibaman', 'exploder', 3], ['saibaman_b', 'fast', 1]],
      boss: { s: 'nappa', name: 'Nappa', scale: 2.3, color: '#ffd060', moves: { ring: 'Bomber DX', dash: 'Shoulder Charge', aimed: 'Mouth Beam' } } },
    { name: 'Planet Namek', era: 'Dragon Ball Z', biome: 'namek',
      grunts: [['frieza_soldier', 'normal', 3], ['frieza_soldier', 'shooter', 1], ['frieza_soldier_b', 'tank', 1]],
      boss: { s: 'frieza', name: 'Frieza', scale: 2, color: '#d050ff', moves: { deathball: 'Death Ball', aimed: 'Death Beam', ring: 'Nova Strike' } } },
    { name: 'Cell Games', era: 'Dragon Ball Z', biome: 'cell',
      grunts: [['cell_jr', 'fast', 3], ['cell_jr_b', 'normal', 2]],
      boss: { s: 'cell', name: 'Perfect Cell', scale: 2.2, color: '#5ad0ff', moves: { beam: 'Kamehameha', ring: 'Perfect Barrier', dash: 'Rush' } } },
    { name: 'Majin Buu', era: 'Dragon Ball Z', biome: 'buu',
      grunts: [['majin', 'normal', 3], ['majin_b', 'tank', 1], ['majin', 'fast', 1]],
      boss: { s: 'kid_buu', name: 'Kid Buu', scale: 2, color: '#ff8ac0', moves: { dash: 'Rubber Rush', aimed: 'Vanishing Beam', deathball: 'Planet Burst', ring: 'Scream' } } },
    { name: "Resurrection 'F'", era: 'Dragon Ball Super', biome: 'grass2',
      grunts: [['frieza_force', 'shooter', 2], ['frieza_force', 'normal', 3], ['frieza_force_b', 'tank', 1]],
      boss: { s: 'frieza_gold', name: 'Golden Frieza', scale: 2.2, color: '#ffd040', moves: { deathball: 'Death Ball', beam: 'Golden Death Beam', ring: 'Nova Strike', aimed: 'Death Beam' } } },
    { name: 'Tournament of Power', era: 'Dragon Ball Super', biome: 'top',
      grunts: [['pride_trooper', 'normal', 3], ['pride_trooper_b', 'fast', 2], ['pride_trooper', 'shooter', 1]],
      boss: { s: 'jiren', name: 'Jiren', scale: 2.4, color: '#ff4040', moves: { ring: 'Power Impact', aimed: 'Power Blast', dash: 'Overwhelm', beam: 'Overheat Blast' } } },
    { name: 'Broly', era: 'Dragon Ball Super', biome: 'ice',
      grunts: [['frieza_force_b', 'tank', 2], ['frieza_force', 'shooter', 1], ['frieza_force', 'fast', 2]],
      boss: { s: 'broly', name: 'Broly', scale: 2.6, color: '#8aff4a', moves: { dash: 'Gigantic Rush', deathball: 'Eraser Cannon', ring: 'Gigantic Roar', aimed: 'Blaster Shell' } } },
  ];

  // Gogeta / Vegito. mult scales the average of both fighters' power.
  const FUSIONS = {
    gogeta: { name: 'Gogeta', leader: 'goku', forms: [
      { name: 'Gogeta', sprite: 'hd/gogeta', mult: 1.5, aura: '#ffffff' },
      { name: 'Super Saiyan Gogeta', sprite: 'hd/gogeta_ssj', mult: 2.1, aura: '#ffd83a', sparks: true },
      { name: 'Super Saiyan Blue Gogeta', sprite: 'hd/gogeta_blue', mult: 3.0, aura: '#40c8ff', sparks: true },
    ] },
    vegito: { name: 'Vegito', leader: 'vegeta', forms: [
      { name: 'Vegito', sprite: 'hd/vegito', mult: 1.5, aura: '#ffffff' },
      { name: 'Super Vegito', sprite: 'hd/vegito_ssj', mult: 2.1, aura: '#ffd83a', sparks: true },
      { name: 'Vegito Blue', sprite: 'hd/vegito_blue', mult: 3.0, aura: '#40c8ff', sparks: true },
    ] },
  };

  // Hoi-Poi capsules dropped by enemies and found around the map.
  const CAPSULES = {
    heal:   { name: 'Medical Capsule', sprite: 'cap_heal', color: '#e8403a', info: 'Restores 35% HP' },
    speed:  { name: 'Speed Capsule', sprite: 'cap_speed', color: '#3a8ae8', info: '+45% move speed for 20s', buff: 'speed', time: 20 },
    dex:    { name: 'Dexterity Capsule', sprite: 'cap_dex', color: '#3ac85a', info: 'Attacks 35% faster and +15% dodge for 20s', buff: 'dex', time: 20 },
    power:  { name: 'Power Capsule', sprite: 'cap_power', color: '#f08a1a', info: '+40% damage for 20s', buff: 'power', time: 20 },
    magnet: { name: 'Magnet Capsule', sprite: 'cap_magnet', color: '#e8d03a', info: 'Pulls in every ki orb' },
    item:   { name: 'Treasure Capsule', sprite: 'cap_item', color: '#f2c43a', info: 'Holds a special item' },
  };

  // Special items: each fighter holds one at a time.
  const ITEMS = {
    pole:   { name: 'Power Pole', sprite: 'item_pole', info: 'Every 2.5s the staff extends and strikes a line of enemies.' },
    nimbus: { name: 'Flying Nimbus', sprite: 'item_nimbus', info: '+30% speed and you fly over terrain.' },
    potara: { name: 'Potara Earrings', sprite: 'item_potara', info: '+20% damage and +15% max HP.' },
    senzu:  { name: 'Senzu Pouch', sprite: 'item_senzu', info: 'Below 25% HP, eat a bean and heal 60%. Refills every 90s.' },
    radar:  { name: 'Dragon Radar', sprite: 'item_radar', info: '+60% pickup range and capsules show on the screen edge.' },
    ring:   { name: 'Time Ring', sprite: 'item_ring', info: 'Enemies near you move 35% slower.' },
  };

  // Rift bosses, fought in a sealed arena. hp/dmg multiply the current saga boss.
  const RIFT_BOSSES = [
    { s: 'raditz', name: 'Raditz', scale: 2.2, color: '#c8a070', hp: 2.4, moves: { aimed: 'Double Sunday', dash: 'Saiyan Rush', ring: 'Shining Friday', summon: 'Saibamen' } },
    { s: 'cooler', name: 'Cooler', scale: 2.3, color: '#9a6aff', hp: 2.8, moves: { deathball: 'Supernova', aimed: 'Death Beam', ring: 'Sauzer Blades', teleport: 'Ambush' } },
    { s: 'hd/goku_black', name: 'Goku Black', scale: 1.5, color: '#ff5ab4', hp: 3, rage: 'hd/goku_rose', rageName: 'Super Saiyan Ros\u00e9', moves: { beam: 'Black Kamehameha', teleport: 'Instant Transmission', ring: 'Divine Lasso', aimed: 'Ki Blade' } },
    { s: 'janemba', name: 'Janemba', scale: 2.5, color: '#ff4a4a', hp: 3.2, moves: { teleport: 'Rakshasa Claw', ring: 'Hell Gate', summon: 'Demon Spawn', deathball: 'Illusion Smash' } },
    { s: 'hit', name: 'Hit', scale: 2.2, color: '#b48aff', hp: 3, moves: { teleport: 'Time Skip', dash: 'Death Blow', aimed: 'Flash Fist Crush' } },
    { s: 'beerus', name: 'Beerus', scale: 2.2, color: '#d0a0ff', hp: 3.6, moves: { deathball: 'Sphere of Destruction', ring: 'Hakai Wave', teleport: 'Godly Strike', beam: 'God of Destruction' } },
  ];

  return { TECHS, PASSIVES, CHARS, GRUNT_TYPES, SAGAS, FUSIONS, CAPSULES, ITEMS, RIFT_BOSSES };
})();
