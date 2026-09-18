import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

/**
 * Renders a density heatmap on the given Leaflet map instance.
 *
 * leaflet.heat has no official React bindings — it's a plugin that
 * attaches L.heatLayer() to the global Leaflet object as a side effect
 * of importing it. This component uses react-leaflet's useMap() hook to
 * get the underlying map instance and add/remove the heat layer
 * imperatively, which is the standard way to bridge non-React Leaflet
 * plugins into react-leaflet.
 *
 * points: array of [lat, lng, intensity] tuples. Intensity should be a
 * small positive number — we use (1 + upvote_count) per complaint so a
 * confirmed complaint contributes more "heat" than a single report.
 */
export default function HeatmapLayer({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return;

    const heatLayer = L.heatLayer(points, {
      radius: 28,
      blur: 22,
      maxZoom: 17,
      gradient: {
        0.2: "#2d6a4f",
        0.4: "#c9822c",
        0.7: "#d97706",
        1.0: "#a63a2c",
      },
    });

    heatLayer.addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points]);

  return null;
}
