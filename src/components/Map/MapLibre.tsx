import 'maplibre-gl/dist/maplibre-gl.css';
import Map from 'react-map-gl/maplibre';

import { MapContainer } from './Map.styled';

const TALLINN_CENTER = {
    latitude: 59.4372,
    longitude: 24.7535,
    zoom: 12
};

// OpenFreeMap provides a high-quality open-source style
const MAP_STYLE = "https://tiles.openfreemap.org/styles/bright";

const MapLibre = () => {
    return (
        <MapContainer>
            <Map mapStyle={MAP_STYLE} initialViewState={TALLINN_CENTER}>
                {/* Navigation control (Zoom/Rotate) is essential for cycling */}
                {/* MapLibre supports 3D tilt and rotation out of the box */}
            </Map>
        </MapContainer>
    );
}

export default MapLibre