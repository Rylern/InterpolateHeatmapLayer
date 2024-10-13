declare module 'interpolateheatmaplayer' {
    import type { CustomLayerInterface } from 'mapbox-gl';

    interface HeatmapPoint {
        lat: number;
        lon: number;
        val: number;
    }

    interface ROI {
        lat: number;
        lon: number;
    }

    interface InterpolateHeatmapLayerOptions {
        points?: HeatmapPoint[];
        layerId?: string;
        opacity?: number;
        minValue?: number;
        maxValue?: number;
        framebufferFactor?: number;
        p?: number;
        roi?: ROI[];
        valueToColor?: string;
        valueToColor4?: string;
        pointRadius?: number;
        fasterPointRadius?: boolean;
        averageThreshold?: number;
        layerBlendingFactor?: GLenum;
        mapBlendingFactor?: GLenum;
    }

    interface InterpolateHeatmapLayer extends CustomLayerInterface {
        updatePoints(points: HeatmapPoint[]): void;
    }

    export function create(
        options: InterpolateHeatmapLayerOptions,
    ): InterpolateHeatmapLayer;
}