import * as turf from '@turf/turf';
import type { Feature, Point, FeatureCollection, LineString } from 'geojson';
import type { TimeBlock, Intent } from './store';
import { fillGap } from './ai';
import { MLCEngine } from '@mlc-ai/web-llm';

export interface POIProperties {
  id: string;
  name: string;
  category: string;
  budget_tier: string;
  typical_duration_minutes: number;
  opening_hours: { open: string; close: string };
}

// Convert HH:mm to minutes since 00:00
const timeToMins = (timeStr: string): number => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const minsToTime = (mins: number): string => {
  const h = Math.floor(mins / 60) % 24;
  const m = Math.floor(mins % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export const fetchPOIs = async (): Promise<Feature<Point, POIProperties>[]> => {
  const res = await fetch('/pois.json');
  const data: FeatureCollection = await res.json();
  return data.features as Feature<Point, POIProperties>[];
};

export const calculateTravelTimeMins = (p1: Feature<Point>, p2: Feature<Point>): number => {
  const distKm = turf.distance(p1, p2, { units: 'kilometers' });
  // Assume 15km/h average speed in city => 4 mins per km
  return Math.ceil(distKm * 4);
};

export const generateItinerary = async (
  engine: MLCEngine,
  intent: Intent,
  answers: Record<string, string>,
  allPOIs: Feature<Point, POIProperties>[]
): Promise<{ blocks: TimeBlock[], routeGeoJSON: Feature<LineString, Record<string, unknown>> | null }> => {
  
  // We'll plan for 1 day for simplicity in this demo, starting at 07:00 and ending at 23:00.
  // Sleep block: 23:00 - 07:00
  // Lunch: 13:00 - 14:00
  // Dinner: 19:00 - 20:30
  
  const blocks: TimeBlock[] = [];
  
  const addBlock = (title: string, start: number, duration: number, type: 'fixed' | 'poi' | 'travel', poi?: Feature<Point, POIProperties>) => {
    blocks.push({
      id: crypto.randomUUID(),
      type,
      title,
      startTime: minsToTime(start),
      endTime: minsToTime(start + duration),
      durationMinutes: duration,
      poi
    });
  };

  // Pre-fill fixed blocks
  addBlock('Sleep / Wake up', timeToMins('00:00'), 7 * 60, 'fixed'); // 00:00 to 07:00
  addBlock('Lunch', timeToMins('13:00'), 60, 'fixed');
  addBlock('Dinner', timeToMins('19:00'), 90, 'fixed');
  addBlock('Sleep', timeToMins('23:00'), 60, 'fixed'); // 23:00 to 24:00

  // Filter POIs by budget (include cheaper tiers)
  const tiers: Record<string, number> = { free: 0, low: 1, medium: 2, high: 3 };
  const userTier = tiers[intent.budget] ?? 3;
  
  let candidatePOIs = allPOIs.filter(p => {
    const poiTier = tiers[p.properties.budget_tier] ?? 2;
    return poiTier <= userTier;
  });
  if (candidatePOIs.length === 0) candidatePOIs = allPOIs; // fallback

  let currentMins = timeToMins('07:00'); // Start day at 7 AM
  const endOfDayMins = timeToMins('23:00');
  
  let currentLocation: Feature<Point> | null = null;
  const usedPoiIds = new Set<string>();

  // A simple assembly loop
  while (currentMins < endOfDayMins) {
    // Check if next block is a fixed block
    const fixedBlock = blocks.find(b => b.type === 'fixed' && timeToMins(b.startTime) === currentMins);
    if (fixedBlock) {
      currentMins += fixedBlock.durationMinutes;
      continue;
    }

    // Find the next available time slot before the next fixed block
    const nextFixedBlock = blocks
      .filter(b => b.type === 'fixed' && timeToMins(b.startTime) > currentMins)
      .sort((a, b) => timeToMins(a.startTime) - timeToMins(b.startTime))[0];
    
    const availableMins = nextFixedBlock 
      ? timeToMins(nextFixedBlock.startTime) - currentMins 
      : endOfDayMins - currentMins;

    if (availableMins < 30) {
      // Too small to do anything, just skip time (free time)
      addBlock('Free time', currentMins, availableMins, 'travel');
      currentMins += availableMins;
      continue;
    }

    // Try to find a suitable POI mathematically via Turf.js
    // We want the closest POI that fits the time slot and is open.
    let bestPoi: Feature<Point, POIProperties> | null = null;
    let shortestTravel = Infinity;

    for (const poi of candidatePOIs) {
      if (usedPoiIds.has(poi.properties.id)) continue;
      
      const travelMins = currentLocation ? calculateTravelTimeMins(currentLocation, poi) : 0;
      const totalRequiredMins = travelMins + poi.properties.typical_duration_minutes;
      
      if (totalRequiredMins <= availableMins) {
        // Check opening hours
        const openMins = timeToMins(poi.properties.opening_hours.open);
        const closeMins = timeToMins(poi.properties.opening_hours.close);
        
        const arrivalMins = currentMins + travelMins;
        const departureMins = arrivalMins + poi.properties.typical_duration_minutes;
        
        if (arrivalMins >= openMins && departureMins <= closeMins) {
          if (travelMins < shortestTravel) {
            shortestTravel = travelMins;
            bestPoi = poi;
          }
        }
      }
    }

    if (bestPoi) {
      if (shortestTravel > 0) {
        addBlock(`Travel to ${bestPoi.properties.name}`, currentMins, shortestTravel, 'travel');
        currentMins += shortestTravel;
      }
      
      addBlock(`Visit ${bestPoi.properties.name}`, currentMins, bestPoi.properties.typical_duration_minutes, 'poi', bestPoi);
      usedPoiIds.add(bestPoi.properties.id);
      currentLocation = bestPoi;
      currentMins += bestPoi.properties.typical_duration_minutes;
    } else {
      // Find the next time a POI opens, to avoid skipping the entire gap
      let nextOpenTime = Infinity;
      for (const poi of candidatePOIs) {
        if (usedPoiIds.has(poi.properties.id)) continue;
        const openMins = timeToMins(poi.properties.opening_hours.open);
        if (openMins > currentMins && openMins < nextOpenTime) {
          nextOpenTime = openMins;
        }
      }
      
      let jumpMins = availableMins;
      if (nextOpenTime !== Infinity && (nextOpenTime - currentMins) > 0 && (nextOpenTime - currentMins) < availableMins) {
        jumpMins = nextOpenTime - currentMins;
      }
      
      // Ensure we jump at least 30 mins to avoid infinite loop
      jumpMins = Math.max(30, jumpMins);

      // Gap filling: Ask LLM for a category suggestion
      const categories = [...new Set(candidatePOIs.map(p => p.properties.category))];
      const suggestedCat = await fillGap(engine, jumpMins, categories, answers);
      
      addBlock(`Free time exploring ${suggestedCat}`, currentMins, jumpMins, 'travel');
      currentMins += jumpMins;
    }
  }

  // Sort blocks chronologically
  blocks.sort((a, b) => timeToMins(a.startTime) - timeToMins(b.startTime));

  // Build GeoJSON route for the map
  const routePoints = blocks
    .filter(b => b.type === 'poi' && b.poi)
    .map(b => b.poi!.geometry.coordinates);

  let routeGeoJSON = null;
  if (routePoints.length > 1) {
    routeGeoJSON = turf.lineString(routePoints);
  }

  return { blocks, routeGeoJSON };
};
