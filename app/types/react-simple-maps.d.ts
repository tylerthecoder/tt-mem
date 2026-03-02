declare module 'react-simple-maps' {
    import { ComponentType, CSSProperties } from 'react';

    interface ProjectionConfig {
        scale?: number;
        center?: [number, number];
        rotate?: [number, number, number];
    }

    interface ComposableMapProps {
        projectionConfig?: ProjectionConfig;
        width?: number;
        height?: number;
        projection?: string;
        style?: CSSProperties;
        children?: React.ReactNode;
    }

    interface ZoomableGroupProps {
        center?: [number, number];
        zoom?: number;
        minZoom?: number;
        maxZoom?: number;
        children?: React.ReactNode;
    }

    interface GeographiesProps {
        geography: string | object;
        children: (data: { geographies: Geography[] }) => React.ReactNode;
    }

    interface Geography {
        rsmKey: string;
        id: string;
        properties: Record<string, unknown>;
        type: string;
        geometry: unknown;
    }

    interface GeographyProps {
        geography: Geography;
        fill?: string;
        stroke?: string;
        strokeWidth?: number;
        onClick?: () => void;
        onMouseEnter?: () => void;
        onMouseLeave?: () => void;
        style?: {
            default?: CSSProperties;
            hover?: CSSProperties;
            pressed?: CSSProperties;
        };
    }

    export const ComposableMap: ComponentType<ComposableMapProps>;
    export const ZoomableGroup: ComponentType<ZoomableGroupProps>;
    export const Geographies: ComponentType<GeographiesProps>;
    export const Geography: ComponentType<GeographyProps>;
}
