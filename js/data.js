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

    // ---- moves added for the original four and the gacha fighters
    solar_flare: { name: 'Solar Flare', type: 'nova', color: '#fffbe0', flash: true, stun: true,
      info: 'A blinding flash that freezes nearby enemies in place.',
      stats: lv => ({ dmg: 4 + 2 * (lv - 1), cd: 9 - 0.7 * (lv - 1), radius: 90 + 12 * (lv - 1), stun: 1.4 + 0.15 * (lv - 1) }) },
    super_kamehameha: { name: 'Super Kamehameha', type: 'beam', color: '#3fb8ff', core: '#ffffff',
      info: 'A Kamehameha with everything behind it.',
      stats: lv => ({ dmg: 16 + 6 * (lv - 1), cd: 7.5 - 0.6 * (lv - 1), dur: 1.3 + 0.1 * (lv - 1), len: 260 + 20 * (lv - 1), width: 15 + 2.5 * (lv - 1) }) },
    meteor_combo: { name: 'Meteor Combo', type: 'strike', color: '#ffcc33',
      info: 'A blur of heavy blows on enemies across the screen.',
      stats: lv => ({ dmg: 30 + 12 * (lv - 1), cd: 4 - 0.3 * (lv - 1), count: [2, 3, 3, 4, 4, 5][lv - 1] }) },
    ki_cannon: { name: 'Ki Blast Cannon', type: 'bomb', color: '#ffe24a', core: '#fffbe0',
      info: 'A dense blast that bursts on impact.',
      stats: lv => ({ dmg: 35 + 14 * (lv - 1), cd: 4.5 - 0.35 * (lv - 1), radius: 44 + 6 * (lv - 1), size: 6, charge: 0.4, speed: 200 }) },
    soaring_dragon: { name: 'Soaring Dragon Strike', type: 'dragon', color: '#ff8a3a', core: '#ffe0b0',
      info: 'A rising dragon of ki that rips through a line of enemies.',
      stats: lv => ({ dmg: 50 + 20 * (lv - 1), cd: 6 - 0.5 * (lv - 1), speed: 270, size: 10, life: 1.1 + 0.1 * (lv - 1) }) },
    shine_shot: { name: 'Shine Shot', type: 'shot', color: '#b05aff', core: '#f4e0ff',
      info: 'Piercing violet ki shots.',
      stats: lv => ({ dmg: 9 + 3 * (lv - 1), cd: 1.4 - 0.1 * (lv - 1), count: [1, 2, 2, 3, 3, 4][lv - 1], pierce: 2, speed: 230, size: 3, spread: 0.25 }) },
    gamma_burst: { name: 'Gamma Burst Flash', type: 'beam', color: '#ffe24a', core: '#ffffff',
      info: 'Two palms, one enormous golden wave.',
      stats: lv => ({ dmg: 18 + 7 * (lv - 1), cd: 8 - 0.6 * (lv - 1), dur: 1.4 + 0.1 * (lv - 1), len: 280 + 20 * (lv - 1), width: 17 + 3 * (lv - 1) }) },
    final_impact: { name: 'Final Impact', type: 'bomb', color: '#5ad0ff', core: '#ffffff',
      info: 'A charged sphere that levels everything it lands on.',
      stats: lv => ({ dmg: 60 + 24 * (lv - 1), cd: 8 - 0.6 * (lv - 1), radius: 70 + 10 * (lv - 1), size: 8, charge: 0.5, speed: 160 }) },
    demon_hand: { name: 'Demon Hand', type: 'strike', color: '#56b048',
      info: 'A stretching arm that snatches enemies anywhere on screen.',
      stats: lv => ({ dmg: 22 + 8 * (lv - 1), cd: 3 - 0.22 * (lv - 1), count: [2, 2, 3, 3, 4, 5][lv - 1] }) },
    kiai_wave: { name: 'Kiai Wave', type: 'nova', color: '#f0f0ff', stun: true,
      info: 'An invisible shout that blasts enemies back and stuns them.',
      stats: lv => ({ dmg: 14 + 6 * (lv - 1), cd: 6 - 0.45 * (lv - 1), radius: 70 + 10 * (lv - 1), stun: 0.6 + 0.1 * (lv - 1) }) },
    destructo_disc: { name: 'Destructo Disc', type: 'shot', style: 'disc', color: '#ffe24a', core: '#fffbe0',
      info: 'A spinning saw of ki that slices through everything.',
      stats: lv => ({ dmg: 20 + 8 * (lv - 1), cd: 2.6 - 0.2 * (lv - 1), count: [1, 1, 2, 2, 3, 3][lv - 1], pierce: 99, speed: 170, size: 6, spread: 0.5 }) },
    scatter_shot: { name: 'Scattering Bullet', type: 'hellzone', color: '#ffd86a', core: '#fffbe0',
      info: 'A ball of ki that splits and rains down on a target.',
      stats: lv => ({ dmg: 9 + 4 * (lv - 1), cd: 4.5 - 0.35 * (lv - 1), count: 6 + 2 * (lv - 1), radius: 16 }) },
    wolf_fang: { name: 'Wolf Fang Fist', type: 'strike', color: '#a0c8ff',
      info: 'A pouncing flurry that tears through several enemies.',
      stats: lv => ({ dmg: 10 + 4 * (lv - 1), cd: 2.4 - 0.2 * (lv - 1), count: [3, 4, 5, 6, 7, 8][lv - 1] }) },
    spirit_ball: { name: 'Spirit Ball', type: 'bomb', color: '#ffe9a0', core: '#ffffff',
      info: 'A guided ball of ki that never misses.',
      stats: lv => ({ dmg: 22 + 9 * (lv - 1), cd: 2 - 0.15 * (lv - 1), radius: 26 + 4 * (lv - 1), size: 4, charge: 0, speed: 240 }) },
    tri_beam: { name: 'Tri-Beam', type: 'beam', color: '#fff07a', core: '#ffffff',
      info: 'A wide, short-range blast from a triangle of hands.',
      stats: lv => ({ dmg: 14 + 6 * (lv - 1), cd: 4.5 - 0.35 * (lv - 1), dur: 0.6, len: 120 + 12 * (lv - 1), width: 18 + 3 * (lv - 1) }) },
    dodon_ray: { name: 'Dodon Ray', type: 'shot', style: 'laser', color: '#ffd86a', core: '#fffbe0',
      info: 'A fingertip ray that pierces a line of enemies.',
      stats: lv => ({ dmg: 12 + 4 * (lv - 1), cd: 1.1 - 0.08 * (lv - 1), count: [1, 1, 2, 2, 2, 3][lv - 1], pierce: [2, 2, 3, 3, 4, 4][lv - 1], speed: 320, size: 2, spread: 0.05 }) },
    infinity_bullet: { name: 'Infinity Bullet', type: 'shot', color: '#ffd040', core: '#fff6c0',
      info: 'A non-stop stream of ki blasts.',
      stats: lv => ({ dmg: 3 + 1.2 * (lv - 1), cd: 1.4 - 0.1 * (lv - 1), count: 7 + 2 * (lv - 1), pierce: 1, speed: 210, size: 2.5, spread: 0.8, burst: 0.45 }) },
    power_blitz: { name: 'Power Blitz', type: 'bomb', color: '#ffe24a', core: '#ffffff',
      info: 'A fast sphere thrown straight into the crowd.',
      stats: lv => ({ dmg: 26 + 10 * (lv - 1), cd: 3.2 - 0.25 * (lv - 1), radius: 34 + 5 * (lv - 1), size: 4, charge: 0, speed: 260 }) },
    energy_field: { name: 'Energy Field', type: 'nova', color: '#a0e0ff',
      info: 'A shell of ki that bursts outward.',
      stats: lv => ({ dmg: 18 + 7 * (lv - 1), cd: 6 - 0.5 * (lv - 1), radius: 60 + 9 * (lv - 1) }) },
    buster_cannon: { name: 'Buster Cannon', type: 'beam', color: '#ffe24a', core: '#fffbe0',
      info: 'A blast fired from both hands.',
      stats: lv => ({ dmg: 6 + 2.2 * (lv - 1), cd: 2.6 - 0.2 * (lv - 1), dur: 0.7 + 0.08 * (lv - 1), len: 140 + 16 * (lv - 1), width: 6 + 1.2 * (lv - 1) }) },
    burning_attack: { name: 'Burning Attack', type: 'bomb', color: '#ffd040', core: '#ffffff',
      info: 'A rapid hand pattern, then a blazing sphere.',
      stats: lv => ({ dmg: 28 + 11 * (lv - 1), cd: 3.6 - 0.28 * (lv - 1), radius: 38 + 6 * (lv - 1), size: 5, charge: 0.2, speed: 220 }) },
    finish_buster: { name: 'Finish Buster', type: 'bomb', color: '#5ad0ff', core: '#ffffff',
      info: 'An overhead sphere hurled with full force.',
      stats: lv => ({ dmg: 55 + 22 * (lv - 1), cd: 7 - 0.55 * (lv - 1), radius: 64 + 9 * (lv - 1), size: 7, charge: 0.5, speed: 170 }) },
    galactic_donut: { name: 'Galactic Donut', type: 'nova', color: '#ffe9a0', stun: true,
      info: 'A ring of ki that binds everything around you.',
      stats: lv => ({ dmg: 10 + 4 * (lv - 1), cd: 7 - 0.5 * (lv - 1), radius: 80 + 10 * (lv - 1), stun: 1.2 + 0.15 * (lv - 1) }) },
    ghost_kamikaze: { name: 'Super Ghost Kamikaze Attack', type: 'hellzone', color: '#e8e8ff', core: '#ffffff',
      info: 'A squad of grinning ghosts that swarm a target and explode.',
      stats: lv => ({ dmg: 16 + 6 * (lv - 1), cd: 5 - 0.4 * (lv - 1), count: 5 + 2 * (lv - 1), radius: 24 }) },
    big_tree_cannon: { name: 'Big Tree Cannon', type: 'beam', color: '#ffe24a', core: '#ffffff',
      info: 'A massive blast from both palms.',
      stats: lv => ({ dmg: 16 + 6 * (lv - 1), cd: 7 - 0.55 * (lv - 1), dur: 1.2 + 0.1 * (lv - 1), len: 250 + 20 * (lv - 1), width: 15 + 2.5 * (lv - 1) }) },
    death_missile: { name: 'Die Die Missile Barrage', type: 'shot', color: '#ffd040', core: '#fff6c0',
      info: 'A wild spray of ki missiles.',
      stats: lv => ({ dmg: 4 + 1.4 * (lv - 1), cd: 1.5 - 0.1 * (lv - 1), count: 6 + 2 * (lv - 1), pierce: 1, speed: 210, size: 3, spread: 1.0, burst: 0.4 }) },
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

  // Power-up ladders for fighters without transformations (aura only), and for the kids.
  function humanForms(sprite, aura, scale) {
    return [
      { name: 'Base', short: 'Base', lv: 1, sprite, power: 1, scale },
      { name: 'Unlocked Potential', short: 'Unlocked', lv: 10, sprite, power: 1.6, aura: '#ffffff', scale },
      { name: 'Full Power', short: 'Full', lv: 22, sprite, power: 2.4, aura, scale },
      { name: 'Max Potential', short: 'Max', lv: 36, sprite, power: 3.6, aura, sparks: true, scale },
      { name: 'Limit Broken', short: 'Limit', lv: 52, sprite, power: 5.6, aura: '#a0e0ff', sparks: true, scale },
    ];
  }
  function kidForms(base, ssj) {
    return [
      { name: 'Base', short: 'Base', lv: 1, sprite: base, power: 1 },
      { name: 'Super Saiyan', short: 'SSJ', lv: 8, sprite: ssj, power: 1.55, aura: '#ffd83a' },
      { name: 'Full Power SSJ', short: 'Full', lv: 20, sprite: ssj, power: 2.4, aura: '#fff07a', sparks: true },
      { name: 'Unleashed', short: 'Unleashed', lv: 36, sprite: ssj, power: 3.8, aura: '#fff07a', sparks: true },
      { name: 'Max Power', short: 'Max', lv: 52, sprite: ssj, power: 5.8, aura: '#ffffff', sparks: true },
    ];
  }

  const CHARS = {
    goku: {
      name: 'Goku', title: 'Raised on Earth', hp: 110, speed: 64, start: 'kamehameha', revive: true,
      perk: 'Zenkai: survive one fatal blow at half HP.',
      techs: [['kamehameha', 1], ['ki_blast', 1], ['kaioken', 4], ['instant_transmission', 10], ['spirit_bomb', 18], ['dragon_fist', 28], ['solar_flare', 7], ['super_kamehameha', 34], ['meteor_combo', 44]],
      forms: [
        { name: 'Base', short: 'Base', lv: 1, sprite: 'hd/goku', power: 1, cut: 'goku' },
        { name: 'Super Saiyan', short: 'SSJ', lv: 8, sprite: 'hd/goku_ssj', power: 1.5, aura: '#ffd83a', cut: 'goku_ssj' },
        { name: 'Super Saiyan 2', short: 'SSJ2', lv: 16, sprite: 'hd/goku_ssj2', power: 2.1, aura: '#fff07a', sparks: true, cut: 'goku_ssj' },
        { name: 'Super Saiyan 3', short: 'SSJ3', lv: 26, sprite: 'hd/goku_ssj3', power: 2.8, aura: '#ffd83a', sparks: true, cut: 'goku_ssj' },
        { name: 'Super Saiyan God', short: 'God', lv: 38, sprite: 'hd/goku_god', power: 3.8, aura: '#ff5a3a', cut: 'goku_god' },
        { name: 'Super Saiyan Blue', short: 'Blue', lv: 50, sprite: 'hd/goku_blue', power: 5, aura: '#40c8ff', cut: 'goku_blue' },
        { name: 'Ultra Instinct', short: 'UI', lv: 64, sprite: 'hd/goku_ui', power: 6.5, aura: '#d4dcff', dodge: 0.2, cut: 'goku' },
      ],
    },
    gohan: {
      name: 'Gohan', title: 'Hidden potential', hp: 105, speed: 64, start: 'masenko',
      perk: 'Rage: up to +40% damage as your HP drops.',
      techs: [['masenko', 1], ['ki_blast', 1], ['hidden_power', 5], ['ultimate_rush', 12], ['father_son', 20], ['special_beam_cannon', 36], ['kamehameha', 9], ['ki_cannon', 24], ['soaring_dragon', 44]],
      forms: [
        { name: 'Base', short: 'Base', lv: 1, sprite: 'hd/gohan', power: 1, cut: 'gohan' },
        { name: 'Super Saiyan', short: 'SSJ', lv: 8, sprite: 'hd/gohan_ssj', power: 1.5, aura: '#ffd83a', cut: 'gohan_ssj' },
        { name: 'Super Saiyan 2', short: 'SSJ2', lv: 16, sprite: 'hd/gohan_ssj2', power: 2.2, aura: '#fff07a', sparks: true, cut: 'gohan_ssj' },
        { name: 'Ultimate', short: 'Ultimate', lv: 30, sprite: 'hd/gohan_ult', power: 3.3, aura: '#ffffff', cut: 'gohan' },
        { name: 'Beast', short: 'Beast', lv: 52, sprite: 'hd/gohan_beast', power: 5.8, aura: '#d050ff', sparks: true },
      ],
    },
    vegeta: {
      name: 'Vegeta', title: 'Prince of all Saiyans', hp: 95, speed: 66, start: 'galick_gun', might: 1.15,
      perk: 'Saiyan Pride: +15% damage, lower max HP.',
      techs: [['galick_gun', 1], ['barrage', 1], ['big_bang', 6], ['final_flash', 14], ['final_explosion', 24], ['hakai', 40], ['shine_shot', 4], ['gamma_burst', 30], ['final_impact', 46]],
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
      name: 'Piccolo', title: 'Namekian warrior', hp: 125, speed: 60, start: 'eye_laser', regen: 0.01, cut: 'piccolo',
      perk: 'Regeneration: recover 1% HP every second.',
      techs: [['eye_laser', 1], ['special_beam_cannon', 3], ['explosive_demon_wave', 8], ['hellzone_grenade', 13], ['light_grenade', 20], ['multiform', 28], ['masenko', 5], ['demon_hand', 18], ['kiai_wave', 38]],
      forms: [
        { name: 'Base', short: 'Base', lv: 1, sprite: 'hd/piccolo', power: 1 },
        { name: 'Fused with Nail', short: 'Nail', lv: 8, sprite: 'hd/piccolo', power: 1.5, aura: '#9af07a' },
        { name: 'Fused with Kami', short: 'Kami', lv: 16, sprite: 'hd/piccolo', power: 2.2, aura: '#ffffff' },
        { name: 'Power Awakening', short: 'Awakened', lv: 32, sprite: 'hd/piccolo', power: 3.4, aura: '#ffffff', sparks: true },
        { name: 'Orange Piccolo', short: 'Orange', lv: 52, sprite: 'hd/piccolo_orange', power: 5.8, aura: '#ff8a2a', scale: 1.25 },
      ],
    },
    // ---- gacha fighters (unlocked by summoning)
    krillin: {
      name: 'Krillin', title: 'Strongest Earthling', hp: 100, speed: 66, start: 'destructo_disc', gacha: 'R', xpMul: 1.15, cut: 'krillin',
      perk: 'Veteran: +15% experience.',
      techs: [['destructo_disc', 1], ['ki_blast', 1], ['solar_flare', 5], ['scatter_shot', 12], ['kamehameha', 20], ['kiai_wave', 30], ['meteor_combo', 40]],
      forms: humanForms('hd/krillin', '#ffe9a0'),
    },
    yamcha: {
      name: 'Yamcha', title: 'Desert bandit', hp: 105, speed: 74, start: 'wolf_fang', gacha: 'R',
      perk: 'Wolf speed: the fastest fighter.',
      techs: [['wolf_fang', 1], ['ki_blast', 1], ['spirit_ball', 6], ['kamehameha', 14], ['meteor_combo', 24], ['kiai_wave', 32], ['super_kamehameha', 44]],
      forms: humanForms('hd/yamcha', '#ffd86a'),
    },
    tien: {
      name: 'Tien', title: 'Three-eyed warrior', hp: 115, speed: 60, start: 'tri_beam', gacha: 'R', area: 1.1,
      perk: 'Third eye: +10% area and range.',
      techs: [['tri_beam', 1], ['dodon_ray', 1], ['solar_flare', 6], ['multiform', 14], ['kiai_wave', 22], ['meteor_combo', 32], ['gamma_burst', 44]],
      forms: humanForms('hd/tien', '#fff07a'),
    },
    nail: {
      name: 'Nail', title: "Guru's guardian", hp: 130, speed: 60, start: 'eye_laser', gacha: 'R', regen: 0.012,
      perk: 'Regeneration: recover 1.2% HP every second.',
      techs: [['eye_laser', 1], ['explosive_demon_wave', 4], ['demon_hand', 10], ['light_grenade', 18], ['kiai_wave', 26], ['masenko', 34], ['special_beam_cannon', 44]],
      forms: humanForms('hd/nail', '#9af07a'),
    },
    a18: {
      name: 'Android 18', title: 'Infinite energy', hp: 105, speed: 68, start: 'infinity_bullet', gacha: 'SR', cdMul: 0.9, cut: 'a18',
      perk: 'Infinite energy: 10% shorter cooldowns.',
      techs: [['infinity_bullet', 1], ['ki_blast', 1], ['destructo_disc', 6], ['power_blitz', 12], ['energy_field', 20], ['meteor_combo', 30], ['final_impact', 42]],
      forms: humanForms('hd/a18', '#a0e0ff'),
    },
    goten: {
      name: 'Goten', title: "Goku's youngest", hp: 100, speed: 68, start: 'kamehameha', gacha: 'SR', xpMul: 1.1,
      perk: 'Fast learner: +10% experience.',
      techs: [['kamehameha', 1], ['ki_blast', 1], ['meteor_combo', 8], ['hidden_power', 14], ['galactic_donut', 24], ['solar_flare', 30], ['super_kamehameha', 40]],
      forms: kidForms('hd/goten', 'hd/goten_ssj'),
    },
    trunks: {
      name: 'Future Trunks', title: 'Warrior from the future', cut: 'trunks', hp: 100, speed: 68, start: 'buster_cannon', gacha: 'SR', might: 1.08,
      perk: 'Royal blood: +8% damage.',
      techs: [['buster_cannon', 1], ['ki_blast', 1], ['burning_attack', 6], ['meteor_combo', 14], ['galick_gun', 22], ['finish_buster', 32], ['big_bang', 42]],
      forms: kidForms('hd/trunks', 'hd/trunks_ssj'),
    },
    gotenks: {
      name: 'Gotenks', title: 'Fusion prodigy', hp: 115, speed: 70, start: 'death_missile', gacha: 'SSR', might: 1.1, komas: [19, 20, 21], cut: 'gotenks',
      perk: 'Fusion power: +10% damage.',
      techs: [['death_missile', 1], ['ki_blast', 1], ['galactic_donut', 5], ['ghost_kamikaze', 12], ['meteor_combo', 20], ['big_tree_cannon', 28], ['super_kamehameha', 40]],
      forms: [
        { name: 'Base', short: 'Base', lv: 1, sprite: 'hd/gotenks', power: 1 },
        { name: 'Super Saiyan', short: 'SSJ', lv: 8, sprite: 'hd/gotenks_ssj', power: 1.6, aura: '#ffd83a' },
        { name: 'Super Saiyan 3', short: 'SSJ3', lv: 26, sprite: 'hd/gotenks_ssj3', power: 3.2, aura: '#ffd83a', sparks: true },
        { name: 'Full Power SSJ3', short: 'Full', lv: 42, sprite: 'hd/gotenks_ssj3', power: 4.8, aura: '#fff07a', sparks: true },
        { name: 'Max Power Gotenks', short: 'Max', lv: 58, sprite: 'hd/gotenks_ssj3', power: 6.6, aura: '#ffffff', sparks: true },
      ],
    },
    sgoku: {
      name: 'Goku (Super)', title: 'Super-era Goku', hp: 115, speed: 66, start: 'kamehameha', gacha: 'SSR', might: 1.1, revive: true, komas: [4, 5, 3],
      perk: 'God ki: +10% damage and survives one fatal blow.',
      techs: [['kamehameha', 1], ['ki_blast', 1], ['kaioken', 4], ['solar_flare', 6], ['instant_transmission', 10], ['meteor_combo', 16], ['spirit_bomb', 22], ['super_kamehameha', 30], ['dragon_fist', 38]],
      forms: [
        { name: 'Base', short: 'Base', lv: 1, sprite: 'hd/sgoku_base', power: 1, cut: 'goku' },
        { name: 'Super Saiyan', short: 'SSJ', lv: 8, sprite: 'hd/sgoku_ssj', power: 1.6, aura: '#ffd83a', cut: 'goku_ssj' },
        { name: 'Super Saiyan God', short: 'God', lv: 24, sprite: 'hd/sgoku_god', power: 2.8, aura: '#ff5a3a', cut: 'goku_god' },
        { name: 'Super Saiyan Blue', short: 'Blue', lv: 38, sprite: 'hd/sgoku_blue', power: 4.4, aura: '#40c8ff', sparks: true, cut: 'goku_blue' },
        { name: 'Ultra Instinct', short: 'UI', lv: 54, sprite: 'hd/sgoku_ui', power: 6.8, aura: '#d4dcff', dodge: 0.2, cut: 'goku' },
      ],
    },
    svegeta: {
      name: 'Vegeta (Super)', title: 'Super-era Vegeta', hp: 105, speed: 68, start: 'galick_gun', gacha: 'SSR', might: 1.2, komas: [11, 9, 10],
      perk: 'Royal pride: +20% damage.',
      techs: [['galick_gun', 1], ['barrage', 1], ['shine_shot', 4], ['big_bang', 8], ['final_flash', 16], ['gamma_burst', 24], ['final_explosion', 32], ['final_impact', 40], ['hakai', 50]],
      forms: [
        { name: 'Base', short: 'Base', lv: 1, sprite: 'hd/svegeta_base', power: 1 },
        { name: 'Super Saiyan', short: 'SSJ', lv: 8, sprite: 'hd/svegeta_ssj', power: 1.6, aura: '#ffd83a' },
        { name: 'Super Saiyan 2', short: 'SSJ2', lv: 18, sprite: 'hd/svegeta_ssj2', power: 2.3, aura: '#fff07a', sparks: true },
        { name: 'Super Saiyan Blue', short: 'Blue', lv: 32, sprite: 'hd/svegeta_blue', power: 4.0, aura: '#40c8ff' },
        { name: 'Blue Evolved', short: 'Evolved', lv: 48, sprite: 'hd/svegeta_evo', power: 6.4, aura: '#3a6aff', sparks: true },
      ],
    },
    bardock: {
      name: 'Bardock', title: 'Father of Goku', hp: 115, speed: 64, start: 'ki_cannon', gacha: 'SR', might: 1.1, cut: 'bardock',
      perk: 'Low-class pride: +10% damage.',
      techs: [['ki_cannon', 1], ['ki_blast', 1], ['meteor_combo', 6], ['big_bang', 12], ['kiai_wave', 20], ['final_impact', 30], ['dragon_fist', 42]],
      forms: humanForms('hd/bardock', '#ffd83a'),
    },
    // ---- LR (Legendary Rare)
    gogeta: {
      name: 'Gogeta', title: 'The fusion that defeats all', hp: 150, speed: 70, start: 'big_bang', gacha: 'LR', might: 1.3, revive: true,
      perk: 'Fusion Dance: +30% damage and survives one fatal blow.',
      techs: [['big_bang', 1], ['ki_blast', 1], ['kamehameha', 4], ['meteor_combo', 8], ['instant_transmission', 12], ['super_kamehameha', 20], ['final_impact', 28], ['hakai', 40]],
      forms: [
        { name: 'Gogeta', short: 'Base', lv: 1, sprite: 'hd/gogeta', power: 1, aura: '#ffffff' },
        { name: 'Super Saiyan Gogeta', short: 'SSJ', lv: 10, sprite: 'hd/gogeta_ssj', power: 1.8, aura: '#ffd83a', sparks: true },
        { name: 'Super Saiyan Blue Gogeta', short: 'Blue', lv: 34, sprite: 'hd/gogeta_blue', power: 4.2, aura: '#40c8ff', sparks: true },
        { name: 'Ultimate Gogeta', short: 'Ultimate', lv: 56, sprite: 'hd/gogeta_blue', power: 7, aura: '#ffffff', sparks: true },
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
      grunts: [['hd/rr_yellow', 'normal', 3], ['hd/rr_bazooka', 'shooter', 1], ['hd/rr_silver', 'shooter', 1], ['hd/rr_murasaki', 'fast', 1], ['hd/rr_metallitron', 'tank', 1]],
      boss: { s: 'hd/tao_rpg', name: 'Mercenary Tao', scale: 1.5, r: 10, color: '#ff7ad0', moves: { dash: 'Pillar Dash', aimed: 'Dodon Ray' },
        title: "The world's greatest assassin", quote: 'I can kill you with just my tongue.', art: 'tao' } },
    { name: 'King Piccolo', era: 'Dragon Ball', biome: 'waste',
      grunts: [['demon', 'normal', 3], ['demon_b', 'fast', 2]],
      boss: { s: 'king_piccolo', name: 'King Piccolo', scale: 2.2, color: '#ff5050', moves: { ring: 'Shockwave', aimed: 'Mouth Blast', beam: 'Explosive Demon Wave' },
        title: 'The Demon King', quote: 'Today the world is mine!' } },
    { name: 'Saiyan Invasion', era: 'Dragon Ball Z', biome: 'rocky',
      grunts: [['hd/saiba', 'exploder', 3], ['hd/saiba_dark', 'fast', 1]],
      boss: { s: 'hd/nappa_l', name: 'Nappa', scale: 1.35, r: 11, color: '#ffd060', moves: { ring: 'Bomber DX', dash: 'Shoulder Charge', aimed: 'Mouth Beam' },
        title: 'Elite Saiyan warrior', quote: "Vegeta! What's his power level?" } },
    { name: 'Planet Namek', era: 'Dragon Ball Z', biome: 'namek',
      grunts: [['hd/fz_soldier', 'normal', 3], ['hd/fz_cui', 'shooter', 1], ['hd/fz_appule', 'fast', 1], ['hd/fz_orlen', 'tank', 1], ['hd/namekian', 'normal', 1]],
      boss: { s: 'hd/frieza_eb', name: 'Frieza', scale: 1.5, r: 12, color: '#d050ff', moves: { deathball: 'Death Ball', aimed: 'Death Beam', ring: 'Nova Strike' },
        title: 'Emperor of the universe', quote: 'My power level is over one million.', art: 'frieza' } },
    { name: 'Cell Games', era: 'Dragon Ball Z', biome: 'cell',
      grunts: [['hd/cell_jr', 'fast', 3], ['hd/cell_jr', 'normal', 2]],
      boss: { s: 'hd/cell_eb', name: 'Perfect Cell', scale: 1.0, r: 11, color: '#5ad0ff', moves: { beam: 'Kamehameha', ring: 'Perfect Barrier', dash: 'Rush' },
        title: 'The perfect being', quote: 'Welcome to the Cell Games!', art: 'cell' } },
    { name: 'Majin Buu', era: 'Dragon Ball Z', biome: 'buu',
      grunts: [['hd/buu_pink', 'normal', 3], ['hd/buu_grey', 'tank', 1], ['hd/buu_purple', 'fast', 2], ['hd/buu_green', 'shooter', 1]],
      boss: { s: 'hd/kid_buu_eb', name: 'Kid Buu', scale: 1.5, r: 9, color: '#ff8ac0', moves: { dash: 'Rubber Rush', aimed: 'Vanishing Beam', deathball: 'Planet Burst', ring: 'Scream' },
        title: 'Pure destruction', quote: 'Hee hee hee! Buu blow you up!', art: 'kid_buu' } },
    { name: "Resurrection 'F'", era: 'Dragon Ball Super', biome: 'grass2',
      grunts: [['hd/fz_soldier', 'shooter', 2], ['hd/fz_soldier', 'normal', 3], ['hd/fz_orlen', 'tank', 1], ['hd/fz_appule', 'fast', 1]],
      boss: { s: 'hd/frieza_golden', name: 'Golden Frieza', scale: 1.5, r: 12, color: '#ffd040', moves: { deathball: 'Death Ball', beam: 'Golden Death Beam', ring: 'Nova Strike', aimed: 'Death Beam' },
        title: 'Back from Hell', quote: 'Behold my golden form!' } },
    { name: 'Tournament of Power', era: 'Dragon Ball Super', biome: 'top',
      grunts: [['pride_trooper', 'normal', 3], ['pride_trooper_b', 'fast', 2], ['pride_trooper', 'shooter', 1]],
      boss: { s: 'jiren', name: 'Jiren', scale: 2.4, color: '#ff4040', moves: { ring: 'Power Impact', aimed: 'Power Blast', dash: 'Overwhelm', beam: 'Overheat Blast' },
        title: "Universe 11's strongest", quote: 'Strength is everything.' } },
    { name: 'Broly', era: 'Dragon Ball Super', biome: 'ice',
      grunts: [['hd/fz_orlen', 'tank', 2], ['hd/fz_cui', 'shooter', 1], ['hd/fz_appule', 'fast', 2]],
      boss: { s: 'hd/broly_eb', name: 'Broly', scale: 1.05, r: 12, color: '#8aff4a', moves: { dash: 'Gigantic Rush', deathball: 'Eraser Cannon', ring: 'Gigantic Roar', aimed: 'Blaster Shell' },
        title: 'The Legendary Super Saiyan', quote: 'Kakarot!!', art: 'broly' } },
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
    { s: 'hd/raditz_eb', name: 'Raditz', scale: 1.2, r: 10, color: '#c8a070', hp: 2.4, moves: { aimed: 'Double Sunday', dash: 'Saiyan Rush', ring: 'Shining Friday', summon: 'Saibamen' },
      title: "Kakarot's older brother", quote: 'Your power level is pathetic.', art: 'raditz' },
    { s: 'hd/cooler_l', name: 'Cooler', scale: 1.15, r: 12, color: '#9a6aff', hp: 2.8, moves: { deathball: 'Supernova', aimed: 'Death Beam', ring: 'Sauzer Blades', teleport: 'Ambush' },
      title: "Frieza's older brother", quote: 'I will show you the true terror of my family.' },
    { s: 'hd/black', name: 'Goku Black', scale: 1.4, r: 10, color: '#ff5ab4', hp: 3, rage: 'hd/rose', rageName: 'Super Saiyan Ros\u00e9', moves: { beam: 'Black Kamehameha', teleport: 'Instant Transmission', ring: 'Divine Lasso', aimed: 'Ki Blade' },
      title: 'A god in a stolen body', quote: 'Mortals must be erased.' },
    { s: 'hd/janemba_l', name: 'Janemba', scale: 1.25, r: 10, color: '#ff4a4a', hp: 3.2, moves: { teleport: 'Rakshasa Claw', ring: 'Hell Gate', summon: 'Demon Spawn', deathball: 'Illusion Smash' },
      title: 'Demon born of pure evil', quote: 'Ja... nem... ba!' },
    { s: 'hit', name: 'Hit', scale: 2.2, color: '#b48aff', hp: 3, moves: { teleport: 'Time Skip', dash: 'Death Blow', aimed: 'Flash Fist Crush' },
      title: 'The legendary assassin', quote: 'Your time is up.' },
    { s: 'hd/beerus_eb', name: 'Beerus', scale: 1.15, r: 10, color: '#d0a0ff', hp: 3.6, moves: { deathball: 'Sphere of Destruction', ring: 'Hakai Wave', teleport: 'Godly Strike', beam: 'God of Destruction' },
      title: 'God of Destruction', quote: "I'm in a bad mood. Let's destroy something.", art: 'beerus' },
    { s: 'hd/ginyu_eb', name: 'Captain Ginyu', scale: 1.2, r: 11, color: '#c070ff', hp: 2.6, moves: { dash: 'Ginyu Rush', aimed: 'Milky Cannon', teleport: 'Body Change', ring: 'Fighting Pose' },
      title: 'Leader of the Ginyu Force', quote: 'Ginyu Force... pose!', art: 'ginyu' },
  ];

  // Summoning: 1 ticket per summon, 10 for a multi. Tickets drop from defeated enemies and bosses.
  // LR (Legendary Rare) pulls play the Dragon Ball intro manga before the card.
  const GACHA = {
    cost: 1, multi: 10,
    rates: [['LR', 0.02], ['SSR', 0.08], ['SR', 0.3], ['R', 0.6]],
    tiers: { R: { color: '#5ab4ff', label: 'R' }, SR: { color: '#ffd040', label: 'SR' }, SSR: { color: '#ff5ab4', label: 'SSR' }, LR: { color: '#ff3a3a', label: 'LR' } },
  };
  // Manga panels from the Dragon Ball intro, played in order for an LR (art/lr/p0..p8).
  const LR_PANELS = 9;
  // Sheets whose frames are larger than the standard fighter scale.
  // SIZES (generated by tools/sizes.py)
  const ART_DENSITY = {
    'hd/goku': 1.5, 'hd/goku_ssj': 1.62, 'hd/goku_ssj2': 1.62, 'hd/goku_god': 1.5, 'hd/goku_blue': 1.62, 'hd/goku_ui': 1.62,
    'hd/gohan': 1.84, 'hd/gohan_ssj': 1.81, 'hd/gohan_ssj2': 1.81, 'hd/gohan_ult': 1.81, 'hd/gohan_beast': 1.81, 'hd/vegeta': 1.56,
    'hd/vegeta_ssj': 1.56, 'hd/vegeta_ssj2': 1.56, 'hd/vegeta_blue': 1.56, 'hd/vegeta_ue': 1.56, 'hd/piccolo': 1.78, 'hd/piccolo_orange': 1.78,
    'hd/yamcha': 1.47, 'hd/tien': 1.44, 'hd/nail': 1.12, 'hd/a18': 1.53, 'hd/trunks': 1.78, 'hd/trunks_ssj': 1.78,
    'hd/bardock': 1.56, 'hd/sgoku_base': 1.25, 'hd/sgoku_ssj': 1.62, 'hd/sgoku_god': 1.66, 'hd/sgoku_blue': 1.62, 'hd/sgoku_ui': 1.79,
    'hd/svegeta_base': 1.5, 'hd/svegeta_ssj': 1.66, 'hd/svegeta_ssj2': 1.62, 'hd/svegeta_blue': 1.59, 'hd/svegeta_evo': 1.62, 'hd/gogeta': 1.47,
    'hd/gogeta_ssj': 1.47, 'hd/gogeta_blue': 1.47, 'hd/vegito': 1.47, 'hd/vegito_ssj': 1.47, 'hd/vegito_blue': 1.47, 'hd/black': 1.66,
    'hd/rose': 1.62, 'hd/goku_ssj3': 1.61, 'hd/krillin': 1.32, 'hd/goten': 1.28, 'hd/goten_ssj': 1.4, 'hd/gotenks': 1.56,
    'hd/gotenks_ssj': 1.56, 'hd/gotenks_ssj3': 1.56, 'hd/rr_yellow': 2.19, 'hd/rr_bazooka': 2.19, 'hd/rr_silver': 2.33, 'hd/rr_murasaki': 3.19,
    'hd/rr_metallitron': 2.38, 'hd/fz_soldier': 1.76, 'hd/fz_cui': 2.1, 'hd/fz_appule': 1.62, 'hd/fz_orlen': 1.9, 'hd/cell_jr': 1.71,
    'hd/namekian': 1.76, 'hd/namekian_b': 1.76, 'hd/buu_pink': 2.19, 'hd/buu_grey': 2.19, 'hd/buu_purple': 2.19, 'hd/buu_green': 2.19,
    'hd/saiba': 3.29, 'hd/saiba_dark': 3.29,
  };
  // /SIZES

  // Ultimate moves: one signature move per fighter, fired at full energy. `quote` is shouted on the cut-in.
  // kinds: beam (dmg per tick), bomb, discs, strikes, pulses, barrage, ghosts.
  const ULTS = {
    goku:    { name: 'Super Spirit Bomb', quote: 'Everyone, lend me your energy!', kind: 'bomb', color: '#7ad0ff', core: '#ffffff', dmg: 900, radius: 170, size: 22, charge: 1.6, speed: 120 },
    gohan:   { name: 'Father-Son Kamehameha', quote: 'Dad... lend me your strength! Kamehameha!', kind: 'beam', color: '#5ad0ff', core: '#ffffff', dmg: 40, len: 560, width: 48, dur: 2.6 },
    vegeta:  { name: 'Final Flash', quote: 'Final... FLASH!!', kind: 'beam', color: '#fff07a', core: '#ffffff', dmg: 45, len: 600, width: 54, dur: 2.4 },
    piccolo: { name: 'Special Beam Cannon', quote: 'Special Beam Cannon... FIRE!', kind: 'beam', style: 'drill', color: '#ffe24a', core: '#fffbe0', spiral: '#c040ff', dmg: 150, len: 640, width: 10, dur: 0.9, tick: 0.06 },
    krillin: { name: 'Destructo Disc Storm', quote: 'Destructo Disc!', kind: 'discs', color: '#ffe24a', core: '#fffbe0', dmg: 260, count: 14 },
    yamcha:  { name: 'Wolf Fang Fist Hurricane', quote: 'Wolf Fang Fist!', kind: 'strikes', color: '#a0c8ff', dmg: 200, hits: 6, every: 0.25 },
    tien:    { name: 'Neo Tri-Beam', quote: 'Neo Tri-Beam... HAAA!', kind: 'pulses', color: '#fff07a', dmg: 180, radius: 220, n: 6, every: 0.4, stun: 1 },
    nail:    { name: "Guardian's Wrath", quote: 'I will protect the Elder!', kind: 'pulses', color: '#9af07a', dmg: 230, radius: 190, n: 4, every: 0.5 },
    a18:     { name: 'Infinity Barrage', quote: "Let's finish this.", kind: 'barrage', color: '#ffd040', core: '#fff6c0', dmg: 60, count: 70, dur: 2.2 },
    goten:   { name: 'Super Kamehameha', quote: 'Kamehameha!', kind: 'beam', color: '#3fb8ff', core: '#ffffff', dmg: 36, len: 520, width: 42, dur: 2.2 },
    trunks:  { name: 'Burning Finish', quote: 'Burning... FINISH!', kind: 'bomb', color: '#ffd040', core: '#ffffff', dmg: 850, radius: 160, size: 16, charge: 0.8, speed: 180 },
    gotenks: { name: 'Super Ghost Kamikaze Army', quote: 'Super Ghost Kamikaze Attack!', kind: 'ghosts', color: '#e8e8ff', core: '#ffffff', dmg: 320, count: 24 },
    sgoku:   { name: 'God Kamehameha', quote: 'Kamehame... HAAA!', kind: 'beam', color: '#40c8ff', core: '#ffffff', dmg: 55, len: 640, width: 56, dur: 2.6 },
    svegeta: { name: 'Final Explosion', quote: 'Goodbye... Trunks.', kind: 'pulses', color: '#ffe88a', dmg: 900, radius: 320, n: 1, every: 0.1, flash: true },
    bardock: { name: 'Final Spirit Cannon', quote: 'This is for all the Saiyans!', kind: 'bomb', color: '#5ad0ff', core: '#ffffff', dmg: 880, radius: 170, size: 18, charge: 1.0, speed: 160 },
    gogeta:  { name: 'Big Bang Kamehameha', quote: 'Big Bang... Kamehameha!', kind: 'beam', color: '#ffd83a', core: '#ffffff', dmg: 80, len: 700, width: 64, dur: 3 },
    vegito:  { name: 'Final Kamehameha', quote: 'Final... Kamehameha!', kind: 'beam', color: '#5ad0ff', core: '#ffffff', dmg: 80, len: 700, width: 64, dur: 3 },
  };

  return { TECHS, PASSIVES, CHARS, GRUNT_TYPES, SAGAS, FUSIONS, CAPSULES, ITEMS, RIFT_BOSSES, GACHA, ART_DENSITY, ULTS, LR_PANELS };
})();
