export const CITY_SCALE = {
  blockSize: 44,
  roadWidth: 14,
  laneWidth: 3.25,
  sidewalkWidth: 5,
  curbHeight: 0.28,
  curbWidth: 0.4,
  groundSize: 150,
} as const;

export const RENDERING = {
  clearColor: 0xc8d8e0,
  pixelRatioCap: 2,
  shadowMapSize: 2048,
  cameraFov: 48,
  cameraNear: 0.1,
  cameraFar: 550,
} as const;

export const COLORS = {
  asphalt: 0x262b2d,
  asphaltShoulder: 0x303639,
  laneWhite: 0xf2f0de,
  laneYellow: 0xe4c44c,
  sidewalk: 0xb9b7ae,
  curb: 0xd7d2c8,
  grass: 0x5f8563,
  selection: 0x62d9ff,
  hover: 0x9fe8ff,
} as const;
