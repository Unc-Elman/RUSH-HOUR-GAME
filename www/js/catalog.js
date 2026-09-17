/**
 * Playable characters available in the Player Store.
 * Prices are in wallet coins earned from runs.
 */
export const CHARACTERS = [
  {
    id: 'runner',
    name: 'Street Runner',
    desc: 'Default getaway kid. Balanced and free.',
    price: 0,
    color: 0x2b6cb0,
    accent: 0x1a365d,
    skin: 0xe8c4a2,
    stats: { speed: 1, coinBonus: 1, gapBonus: 1, jump: 1 },
    badge: 'STARTER',
  },
  {
    id: 'sprinter',
    name: 'Night Sprinter',
    desc: 'Faster top speed. Harder for the cop to close.',
    price: 150,
    color: 0x38a169,
    accent: 0x276749,
    skin: 0xd4a574,
    stats: { speed: 1.12, coinBonus: 1, gapBonus: 1.08, jump: 1 },
    badge: 'SPEED',
  },
  {
    id: 'thief',
    name: 'Coin Thief',
    desc: 'Bigger coin payouts and combo rewards.',
    price: 220,
    color: 0x805ad5,
    accent: 0x553c9a,
    skin: 0xc4a484,
    stats: { speed: 1, coinBonus: 1.45, gapBonus: 1, jump: 1.05 },
    badge: 'LOOT',
  },
  {
    id: 'acrobat',
    name: 'Rooftop Acrobat',
    desc: 'Higher jumps and longer slides.',
    price: 280,
    color: 0xdd6b20,
    accent: 0x9c4221,
    skin: 0xf0d0b0,
    stats: { speed: 1.05, coinBonus: 1.1, gapBonus: 1.05, jump: 1.22 },
    badge: 'AGILE',
  },
  {
    id: 'ghost',
    name: 'Alley Ghost',
    desc: 'Near-misses push the cop much farther back.',
    price: 400,
    color: 0x4a5568,
    accent: 0x2d3748,
    skin: 0xe2e8f0,
    stats: { speed: 1.08, coinBonus: 1.15, gapBonus: 1.25, jump: 1.1 },
    badge: 'ELITE',
  },
  {
    id: 'legend',
    name: 'City Legend',
    desc: 'All-around pro. The ultimate escape artist.',
    price: 750,
    color: 0xc53030,
    accent: 0x742a2a,
    skin: 0xdeb887,
    stats: { speed: 1.18, coinBonus: 1.35, gapBonus: 1.2, jump: 1.15 },
    badge: 'LEGEND',
  },
];

export function getCharacter(id) {
  return CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
}
