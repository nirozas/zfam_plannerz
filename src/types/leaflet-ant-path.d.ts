declare module 'leaflet-ant-path' {
    import * as L from 'leaflet';

    export class AntPath extends L.Polyline {
        constructor(path: L.LatLngExpression[] | L.LatLngExpression[][], options?: any);
        addTo(map: L.Map | L.LayerGroup): this;
    }
}
