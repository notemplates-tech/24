export interface SearchResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
}

export const searchAddress = async (query: string): Promise<SearchResult[]> => {
  if (!query || query.length < 3) return [];

  try {
    // Add limit and addressdetails for better results and performance
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&accept_language=ru&limit=5&addressdetails=1`
    );
    
    if (!response.ok) {
      // Handle HTTP errors gracefully
      return [];
    }

    const data = await response.json();
    
    // Validate that data is an array before returning
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  } catch (error) {
    console.error("Geocoding error:", error);
    return [];
  }
};

export const reverseGeocode = async (lat: number, lon: number): Promise<string | null> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept_language=ru`
    );

    if (!response.ok) return null;

    const data = await response.json();
    return data?.display_name || null;
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return null;
  }
};

export const getDeviceLocation = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser"));
    } else {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        (error) => {
          reject(new Error(error.message || "Failed to retrieve location info"));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  });
};

export const getMagneticDeclination = async (lat: number, lon: number): Promise<number> => {
  try {
    const params = new URLSearchParams({
      lat1: lat.toString(),
      lon1: lon.toString(),
      resultFormat: 'json',
      client: 'gemini-widget' 
    });

    const response = await fetch(`https://www.ngdc.noaa.gov/geomag-web/calculators/calculateDeclination?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error("Service unavailable");
    }

    const data = await response.json();
    if (data && data.result && data.result.length > 0) {
      return data.result[0].declination;
    }
    throw new Error("Invalid data format from declination service");
  } catch (error: any) {
    console.warn("Could not fetch magnetic declination:", error);
    let msg = "Failed to fetch declination";
    if (error instanceof Error) {
      msg = error.message;
    } else if (typeof error === 'object' && error !== null && 'message' in error) {
      msg = String((error as any).message);
    } else if (typeof error === 'string') {
      msg = error;
    }
    throw new Error(msg);
  }
};

export const getAltitude = async (lat: number, lon: number): Promise<number | null> => {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`
    );
    
    if (!response.ok) return null;

    const data = await response.json();
    if (data && data.elevation && data.elevation.length > 0) {
      return data.elevation[0];
    }
    return null;
  } catch (error) {
    console.warn("Altitude fetch failed:", error);
    return null;
  }
};

export const getBatchAltitudes = async (locations: {lat: number, lon: number}[]): Promise<(number | null)[]> => {
  if (locations.length === 0) return [];
  try {
    const lats = locations.map(l => l.lat).join(',');
    const lons = locations.map(l => l.lon).join(',');
    const response = await fetch(
      `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lons}`
    );
    
    if (!response.ok) return new Array(locations.length).fill(null);

    const data = await response.json();
    return data.elevation || new Array(locations.length).fill(null);
  } catch (error) {
    console.error("Batch altitude fetch failed:", error);
    return new Array(locations.length).fill(null);
  }
};
