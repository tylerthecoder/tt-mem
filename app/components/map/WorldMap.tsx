'use client';

import React, { memo } from 'react';
import {
    ComposableMap,
    Geographies,
    Geography,
    ZoomableGroup,
} from 'react-simple-maps';
import { numericToAlpha2 } from '@/lib/countryCodes';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

interface WorldMapProps {
    highlightedCountryCode?: string;
    onCountryClick?: (countryCode: string) => void;
    selectedCountryCode?: string;
    correctCountryCode?: string;
    showFeedback?: boolean;
    interactive?: boolean;
}

function WorldMap({
    highlightedCountryCode,
    onCountryClick,
    selectedCountryCode,
    correctCountryCode,
    showFeedback = false,
    interactive = false,
}: WorldMapProps) {
    const getCountryFill = (geoId: string): string => {
        const alpha2 = numericToAlpha2(geoId);
        if (!alpha2) return '#D6D6DA';

        if (showFeedback && correctCountryCode) {
            if (alpha2 === correctCountryCode.toUpperCase()) {
                return '#22c55e'; // green - correct
            }
            if (selectedCountryCode && alpha2 === selectedCountryCode.toUpperCase() && alpha2 !== correctCountryCode.toUpperCase()) {
                return '#ef4444'; // red - wrong selection
            }
        }

        if (!showFeedback && selectedCountryCode && alpha2 === selectedCountryCode.toUpperCase()) {
            return '#3b82f6'; // blue - selected but not yet submitted
        }

        if (highlightedCountryCode && alpha2 === highlightedCountryCode.toUpperCase()) {
            return '#f59e0b'; // amber - highlighted for display
        }

        return '#D6D6DA';
    };

    return (
        <div className="w-full max-w-2xl mx-auto">
            <ComposableMap
                projectionConfig={{ scale: 147 }}
                width={800}
                height={400}
                style={{ width: '100%', height: 'auto' }}
            >
                <ZoomableGroup>
                    <Geographies geography={GEO_URL}>
                        {({ geographies }) =>
                            geographies.map((geo) => {
                                const geoId = geo.id;
                                return (
                                    <Geography
                                        key={geo.rsmKey}
                                        geography={geo}
                                        fill={getCountryFill(geoId)}
                                        stroke="#FFFFFF"
                                        strokeWidth={0.5}
                                        onClick={() => {
                                            if (!interactive || !onCountryClick) return;
                                            const alpha2 = numericToAlpha2(geoId);
                                            if (alpha2) onCountryClick(alpha2);
                                        }}
                                        style={{
                                            default: { outline: 'none' },
                                            hover: {
                                                fill: interactive ? '#93c5fd' : getCountryFill(geoId),
                                                outline: 'none',
                                                cursor: interactive ? 'pointer' : 'default',
                                            },
                                            pressed: { outline: 'none' },
                                        }}
                                    />
                                );
                            })
                        }
                    </Geographies>
                </ZoomableGroup>
            </ComposableMap>
        </div>
    );
}

export default memo(WorldMap);
