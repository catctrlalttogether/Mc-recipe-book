/**
 * Asset URL resolver referencing official in-game textures from TinyTank800/MinecraftAllImages
 * for vanilla Minecraft items and blocks.
 */

// Local fallback for items that don't exist in 1.21.1 yet (e.g. Pale Oak update)
const localAssets = new Set([
  'pale_oak_boat',
  'pale_oak_chest_boat',
  'pale_oak_door',
  'pale_oak_hanging_sign',
  'pale_oak_log',
  'pale_oak_planks',
  'pale_oak_sign',
  'pale_oak_trapdoor',
  'stripped_pale_oak_log'
]);

// Map block variants to their base textures since we don't have isometric renders for them yet
const localAssetAliases: Record<string, string> = {
  'pale_oak_slab': 'pale_oak_planks',
  'pale_oak_stairs': 'pale_oak_planks',
  'pale_oak_fence': 'pale_oak_planks',
  'pale_oak_fence_gate': 'pale_oak_planks',
  'pale_oak_pressure_plate': 'pale_oak_planks',
  'pale_oak_button': 'pale_oak_planks',
  'pale_oak_wood': 'pale_oak_log',
  'stripped_pale_oak_wood': 'stripped_pale_oak_log'
};

export function getItemImageUrl(itemId: string): string {
  const cleanId = itemId.replace(/^minecraft:/, '').toLowerCase();
  
  if (localAssets.has(cleanId)) {
    return `/assets/items/${cleanId}.png`;
  }
  
  if (localAssetAliases[cleanId]) {
    return `/assets/items/${localAssetAliases[cleanId]}.png`;
  }

  return `https://raw.githubusercontent.com/TinyTank800/MinecraftAllImages/main/public/images-v2/1.21.1/${cleanId}.png`;
}

export function getFallbackImageUrl(itemId: string): string {
  const cleanId = itemId.replace(/^minecraft:/, '').toLowerCase();

  if (localAssets.has(cleanId)) {
    return `/assets/items/${cleanId}.png`;
  }
  
  if (localAssetAliases[cleanId]) {
    return `/assets/items/${localAssetAliases[cleanId]}.png`;
  }
  return `https://raw.githubusercontent.com/TinyTank800/MinecraftAllImages/main/public/images/1.20.6/${cleanId}.png`;
}
