import { Category, Product } from '../../domain/models/catalog.model.js';
import { CouponDiscount } from '../../domain/models/cart.model.js';

export const SEED_CATEGORIES: Category[] = [
  {
    id: 'cat-wallets',
    name: 'Hardware Wallets & Cold Storage',
    slug: 'wallets',
    icon: '🔐',
    description: 'Military-grade hardware wallets, metal seed plates, and biometric crypto keys.',
  },
  {
    id: 'cat-merch',
    name: 'Web3 & Cyberpunk Apparel',
    slug: 'merch',
    icon: '👕',
    description: 'Premium embroidered hoodies, tees, caps, and laser-engraved coin badges.',
  },
  {
    id: 'cat-nodes',
    name: 'Validator Nodes & Mining Tech',
    slug: 'nodes',
    icon: '⚡',
    description: 'Plug-and-play Ethereum / Stellar / Bitcoin full nodes and quiet ASIC silencers.',
  },
  {
    id: 'cat-software',
    name: 'Dev Licenses & Pro Toolkits',
    slug: 'software',
    icon: '💻',
    description: 'Enterprise API keys, audited smart contract templates, and trading terminal access.',
  },
];

export const SEED_PRODUCTS: Product[] = [
  {
    id: 'prod-titan-key',
    categoryId: 'cat-wallets',
    name: 'TitanShield Pro Hardware Wallet',
    description: 'EAL6+ certified secure element with touch screen and air-gapped QR transaction signing. Supports 5,000+ assets including BSC, Tron, Stellar, and Ethereum.',
    priceUsd: 149.0,
    stock: 25,
    isActive: true,
    tags: ['bestseller', 'hardware', 'airgapped'],
  },
  {
    id: 'prod-metal-seed',
    categoryId: 'cat-wallets',
    name: 'Indestructible Titanium Seed Phrase Plate',
    description: 'Aerospace-grade titanium plate resistant to 1668°C heat, water submersion, and acid corrosion. Fits up to 24 BIP-39 mnemonic seed words.',
    priceUsd: 39.0,
    stock: 60,
    isActive: true,
    tags: ['security', 'backup'],
  },
  {
    id: 'prod-cypher-hoodie',
    categoryId: 'cat-merch',
    name: 'Cypherpunk Genesis Heavyweight Hoodie',
    description: '450 GSM ultra-heavy combed cotton hoodie featuring reflective cryptographic hash prints and concealed Faraday pouch for smartphone shielding.',
    priceUsd: 85.0,
    stock: 40,
    isActive: true,
    tags: ['apparel', 'limited'],
  },
  {
    id: 'prod-soroban-cap',
    categoryId: 'cat-merch',
    name: 'Web3 Architect Snapback Cap',
    description: 'Breathable structured cap with high-density embroidered blockchain consensus algorithm diagram.',
    priceUsd: 32.0,
    stock: 50,
    isActive: true,
    tags: ['apparel'],
  },
  {
    id: 'prod-node-mini',
    categoryId: 'cat-nodes',
    name: 'Stellar & Soroban Dedicated Mini Node',
    description: 'Fanless 8-core, 32GB DDR5, 2TB NVMe PCIe 4.0 mini computer pre-configured with Stellar Core, Soroban RPC, and auto-failover supervisor.',
    priceUsd: 499.0,
    stock: 12,
    isActive: true,
    tags: ['node', 'hardware', 'stellar'],
  },
  {
    id: 'prod-contract-suite',
    categoryId: 'cat-software',
    name: 'Audited Escrow & Micro-Donation Protocol Suite',
    description: 'Battle-tested, ready-to-deploy Rust Soroban & Solidity escrow contract templates with 100% test coverage and formal verification reports.',
    priceUsd: 120.0,
    stock: 100,
    isActive: true,
    tags: ['digital', 'developer', 'smart-contract'],
  },
];

export const SEED_COUPONS: CouponDiscount[] = [
  {
    code: 'WELCOME10',
    percent: 10,
    description: '10% off your initial order',
    isActive: true,
  },
  {
    code: 'LABORX20',
    percent: 20,
    description: 'Special 20% discount for LaborX community members',
    isActive: true,
  },
  {
    code: 'WEB3DEV',
    percent: 15,
    description: '15% discount for verified Web3 developers',
    isActive: true,
  },
];
