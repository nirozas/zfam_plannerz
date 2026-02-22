import React, { useEffect, useMemo, useState } from 'react';
import {
    MapContainer,
    TileLayer,
    Marker,
    useMap,
    useMapEvents,
    Popup,
    LayersControl
} from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css';
import 'leaflet-polylinedecorator';

// Fix Leaflet's default icon paths in Vite
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { TripStop } from '../../types/trip';

if (typeof window !== 'undefined') {
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: markerIconRetina,
        iconUrl: markerIcon,
        shadowUrl: markerShadow,
    });
}

interface TripMapViewProps {
    stops: TripStop[];
    selectedStop?: TripStop | null;
    onMarkerClick?: (stop: TripStop) => void;
    showPath?: boolean;
    renderPopup?: (stop: TripStop) => React.ReactNode;
}

// Controller to handle flying to selected item and fitting bounds
function MapController({ selectedStop, stops }: { selectedStop?: TripStop | null, stops: TripStop[] }) {
    const map = useMap();

    useEffect(() => {
        if (selectedStop && selectedStop.latitude && selectedStop.longitude) {
            map.flyTo([selectedStop.latitude, selectedStop.longitude], Math.max(map.getZoom(), 12), {
                duration: 1.5,
                easeLinearity: 0.25
            });
        }
    }, [selectedStop, map]);

    useEffect(() => {
        const validStops = stops.filter(s => s.latitude && s.longitude);
        if (validStops.length > 0) {
            const bounds = L.latLngBounds(validStops.map(s => [s.latitude!, s.longitude!]));
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
    }, [stops, map]);

    return null;
}

// Custom Polyline with Directional Arrows
function DirectionalPolyline({ positions, mapStyle }: { positions: [number, number][], mapStyle: string }) {
    const map = useMap();

    useEffect(() => {
        if (!positions || positions.length < 2) return;

        const isDark = mapStyle === 'Satellite';
        const arrowColor = isDark ? '#ffffff' : '#000000';
        // 30% thicker: weight 2 -> 3, pixelSize 14 -> 18
        const lineWeight = 3;

        // Draw the solid line (user requested solid arrows/line)
        const polyline = L.polyline(positions, {
            color: arrowColor,
            weight: lineWeight,
            opacity: 0.8,
            lineJoin: 'round'
        }).addTo(map);

        // Add repeating arrows indicating direction
        const decorator = (L as any).polylineDecorator(polyline, {
            patterns: [
                {
                    offset: '20px',
                    repeat: '80px', // More frequent arrows for better visibility
                    symbol: (L as any).Symbol.arrowHead({
                        pixelSize: 18,
                        polygon: true, // Solid filled arrow head
                        pathOptions: {
                            stroke: true,
                            weight: 1,
                            color: arrowColor,
                            opacity: 1,
                            fill: true,
                            fillColor: arrowColor,
                            fillOpacity: 1
                        }
                    })
                }
            ]
        }).addTo(map);

        return () => {
            map.removeLayer(polyline);
            map.removeLayer(decorator);
        };
    }, [map, positions, mapStyle]);

    return null;
}

// Custom Marker generation similar to FamilyZoabi & ItineraryView
const getDayColor = (dayNumber: number) => {
    const colors = [
        '#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6',
        '#10b981', '#3b82f6', '#f472b6', '#0ea5e9', '#64748b'
    ];
    return colors[(dayNumber - 1) % colors.length];
};

const createStickerIcon = (stop: TripStop) => {
    const color = getDayColor(stop.day_number || 1);
    const hasImage = !!stop.image_url;

    const backgroundStyle = hasImage
        ? `background-image: url(${stop.image_url}); background-size: cover; background-position: center; border: 2px solid white;`
        : `background-color: ${color}; border: 4px solid white;`;

    const html = `
        <div class="relative flex items-center justify-center cursor-pointer group">
            <div class="w-10 h-10 rounded-full shadow-lg flex items-center justify-center text-[11px] font-black text-white hover:ring-4 hover:ring-indigo-500/20 transition-all transform hover:rotate-6 overflow-hidden" style="${backgroundStyle}">
                ${!hasImage ? `<div class="bg-black/10 w-full h-full flex items-center justify-center shadow-inner"><span>${stop.day_number}</span></div>` : ''}
            </div>
            ${!hasImage ? `<div class="absolute -bottom-1 text-[8px] font-black px-1.5 py-0.5 rounded-sm bg-gray-900 border border-white text-white whitespace-nowrap opacity-100 group-hover:-translate-y-1 transition-transform shadow-md">${stop.arrival_time || 'Day ' + stop.day_number}</div>` : ''}
        </div>
    `;

    return L.divIcon({
        html,
        className: 'custom-leaflet-marker',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20]
    });
};


const TripMapView: React.FC<TripMapViewProps> = ({
    stops,
    selectedStop,
    onMarkerClick,
    showPath = true,
    renderPopup
}) => {
    const [mapStyle, setMapStyle] = useState('Streets (Default)');
    const validStops = useMemo(() => {
        return [...stops]
            .filter(s => s.latitude && s.longitude)
            .sort((a, b) => {
                if (a.day_number !== b.day_number) return a.day_number - b.day_number;
                if (a.arrival_time && b.arrival_time) return a.arrival_time.localeCompare(b.arrival_time);
                if (a.arrival_time) return -1;
                if (b.arrival_time) return 1;
                return a.order_index - b.order_index;
            });
    }, [stops]);

    const pathCoordinates = useMemo(() => validStops.map(s => [s.latitude!, s.longitude!] as [number, number]), [validStops]);

    return (
        <MapContainer
            center={[0, 0]}
            zoom={2}
            className="w-full h-full custom-map-container"
            zoomControl={false}
            scrollWheelZoom={true}
        >
            <MapEvents {...{ baselayerchange: (e: any) => setMapStyle(e.name) }} />
            <LayersControl position="topright">
                <LayersControl.BaseLayer checked name="Streets (Default)">
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Satellite">
                    <TileLayer
                        attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Light (Minimal)">
                    <TileLayer
                        attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    />
                </LayersControl.BaseLayer>
            </LayersControl>

            <MapController selectedStop={selectedStop} stops={validStops} />

            <MarkerClusterGroup
                chunkedLoading={true}
                maxClusterRadius={40}
                showCoverageOnHover={false}
                zoomToBoundsOnClick={true}
            >
                {validStops.map((stop) => (
                    <Marker
                        key={stop.id}
                        position={[stop.latitude!, stop.longitude!]}
                        icon={createStickerIcon(stop)}
                        eventHandlers={{
                            click: () => onMarkerClick && onMarkerClick(stop)
                        }}
                    >
                        {renderPopup && (
                            <Popup className="polaroid-popup">
                                {renderPopup(stop)}
                            </Popup>
                        )}
                    </Marker>
                ))}
            </MarkerClusterGroup>

            {showPath && pathCoordinates.length > 1 && (
                <DirectionalPolyline positions={pathCoordinates} mapStyle={mapStyle} />
            )}
        </MapContainer>
    );
};

function MapEvents({ baselayerchange }: { baselayerchange: (e: any) => void }) {
    useMapEvents({ baselayerchange });
    return null;
}

export default TripMapView;
