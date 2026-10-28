/**
 * Room layout in meters (y up, the back wall faces +z, the default camera looks toward -z).
 * Objects are positioned from these constants so the diorama stays consistent.
 */
export type Vec3 = [number, number, number];

export const ROOM = { halfWidth: 2.9, backZ: -2.2, frontZ: 3.5, height: 3.0, wallThickness: 0.1 };

export const DESK = { x: 0.2, z: -1.78, width: 1.9, depth: 0.74, topY: 0.75, thickness: 0.045 };

export const WINDOW = { x: -1.6, y: 1.72, width: 1.1, height: 1.2 };

export const DOOR = { x: 1.6, width: 0.9, height: 2.05 };

export const POSITIONS = {
  lamp: [-0.5, DESK.topY, -1.98] as Vec3,
  laptop: [0.08, DESK.topY, -1.8] as Vec3,
  notebook: [0.7, DESK.topY, -1.86] as Vec3,
  mug: [0.5, DESK.topY, -1.56] as Vec3,
  fidget: [-0.3, DESK.topY, -1.58] as Vec3,
  drawerUnit: [0.82, 0, -1.8] as Vec3,
  shelf: [0.82, 1.5, ROOM.backZ] as Vec3,
  bed: [2.2, 0, -1.25] as Vec3,
  nightstand: [1.36, 0, -2.0] as Vec3,
  plant: [-2.5, 0, -0.55] as Vec3,
  buddyDesk: [-1.6, 0, -1.88] as Vec3,
  buddyChair: [-1.55, 0, -1.25] as Vec3,
  sticky: [-0.62, 1.42, ROOM.backZ + 0.012] as Vec3,
  rug: [0.15, 0.004, -1.0] as Vec3,
};

export const NIGHTSTAND = { width: 0.34, depth: 0.34, height: 0.5 };
export const PHONE_POSITION: Vec3 = [POSITIONS.nightstand[0] - 0.02, NIGHTSTAND.height, POSITIONS.nightstand[2] + 0.04];

/** The chair is pulled out while you stand and tucked under you when you sit. */
export const CHAIR = {
  standing: { position: [0.38, 0, -0.86] as Vec3, rotationY: -0.28 },
  seated: { position: [0.2, 0, -0.78] as Vec3, rotationY: 0 },
};

/**
 * How the camera responds to the pointer in a framing.
 * - parallax: small sideways drift (the diorama feel)
 * - look: turn your head (yaw/pitch ranges in radians; positive yaw turns left)
 */
export type LookMode = { kind: "parallax"; amp: number } | { kind: "look"; yaw: [number, number]; pitch: [number, number] };

export type Framing = { position: Vec3; target: Vec3; look: LookMode };

export const FRAMINGS = {
  standing: { position: [0.05, 1.5, 2.55], target: [0, 1.08, -1.6], look: { kind: "parallax", amp: 1 } },
  seated: { position: [0.2, 1.16, -0.7], target: [0.2, 0.8, -1.85], look: { kind: "look", yaw: [-0.55, 0.55], pitch: [-0.2, 0.35] } },
  // Propped on the pillow looking toward the desk and window; turn right for the nightstand, left for the door.
  lying: { position: [2.2, 0.84, -1.7], target: [-0.6, 1.05, -1.45], look: { kind: "look", yaw: [-1.0, 1.3], pitch: [-0.5, 0.5] } },
  laptop: { position: [0.1, 1.12, -0.82], target: [0.08, 0.92, -1.9], look: { kind: "parallax", amp: 0.15 } },
  calendar: { position: [2.2, 1.92, -1.42], target: [2.2, 1.94, -2.19], look: { kind: "look", yaw: [-0.08, 0.08], pitch: [-0.06, 0.06] } },
  drawer: { position: [0.86, 1.62, -0.66], target: [0.82, 0.55, -1.3], look: { kind: "parallax", amp: 0.15 } },
  fidget: { position: [-0.27, 0.98, -1.3], target: [-0.3, 0.755, -1.58], look: { kind: "look", yaw: [-0.12, 0.12], pitch: [-0.08, 0.08] } },
  notebook: { position: [0.62, 1.2, -1.6], target: [0.6, 0.76, -1.84], look: { kind: "look", yaw: [-0.12, 0.12], pitch: [-0.08, 0.08] } },
  mug: { position: [0.44, 0.99, -1.22], target: [0.5, 0.82, -1.56], look: { kind: "look", yaw: [-0.12, 0.12], pitch: [-0.08, 0.08] } },
  lamp: { position: [-0.28, 1.06, -1.45], target: [-0.45, 0.98, -1.95], look: { kind: "look", yaw: [-0.15, 0.15], pitch: [-0.1, 0.1] } },
} satisfies Record<string, Framing>;

export const CAMERA_FOV = 42;
