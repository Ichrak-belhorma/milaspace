/**
 * Room layout in meters (y up, the back wall faces +z, the camera looks toward -z).
 * Objects are positioned from these constants so the diorama stays consistent.
 */
export type Vec3 = [number, number, number];

export const ROOM = { halfWidth: 2.9, backZ: -2.2, frontZ: 3.5, height: 3.0, wallThickness: 0.1 };

export const DESK = { x: 0.2, z: -1.78, width: 1.9, depth: 0.74, topY: 0.75, thickness: 0.045 };

export const WINDOW = { x: -1.6, y: 1.72, width: 1.1, height: 1.2 };

export const POSITIONS = {
  lamp: [-0.5, DESK.topY, -1.98] as Vec3,
  laptop: [0.08, DESK.topY, -1.8] as Vec3,
  notebook: [0.7, DESK.topY, -1.86] as Vec3,
  mug: [0.5, DESK.topY, -1.56] as Vec3,
  fidget: [-0.3, DESK.topY, -1.58] as Vec3,
  drawerUnit: [0.82, 0, -1.8] as Vec3,
  shelf: [0.82, 1.5, ROOM.backZ] as Vec3,
  bed: [2.2, 0, -1.25] as Vec3,
  plant: [-2.45, 0, -1.75] as Vec3,
  rug: [0.15, 0.004, -1.0] as Vec3,
};

/** Camera framings. Parallax offsets are added on top of the room framing. */
export const CAMERA = {
  room: { position: [0.05, 1.5, 2.55] as Vec3, target: [0, 1.08, -1.6] as Vec3, fov: 42 },
  laptop: { position: [0.1, 1.12, -0.82] as Vec3, target: [0.08, 0.92, -1.9] as Vec3 },
  /** Leaning in to look into the open drawer. */
  drawer: { position: [0.86, 1.62, -0.66] as Vec3, target: [0.82, 0.55, -1.3] as Vec3 },
};
