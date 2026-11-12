// Map: a night render of Maniago (public/assets/images/location-map.webp, 1672×941).
// Positions are fractions of the image; the labels follow the image under object-fit: cover.
export const MAP_ASPECT = 1672 / 941;
/** The lit building: Studio Memento, Piazzetta Trento. */
export const MAP_STUDIO = { x: 0.629, y: 0.354 };
/** Landmarks named on the map, with the walk from the studio. */
export const MAP_PLACES = [
  { id: 'piazza', name: 'Piazza Italia', minutes: 4, side: 'right', x: 0.36, y: 0.757 },
] as const;
