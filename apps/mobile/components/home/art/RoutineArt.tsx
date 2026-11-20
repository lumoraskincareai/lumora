import React from "react";
import Svg, { Defs, Ellipse, LinearGradient, Path, Rect, Stop } from "react-native-svg";

// Serum bottle, jar and leaves on a pedestal. Green on purpose, to read as "natural skincare".
export function RoutineArt({ green, width = 128, height = 104 }: { green: string; width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 128 104">
      <Defs>
        <LinearGradient id="glass" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#CFE8C9" />
          <Stop offset="0.5" stopColor="#EAF6E4" />
          <Stop offset="1" stopColor="#B9DDB1" />
        </LinearGradient>
        <LinearGradient id="metal" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#B8BEC6" />
          <Stop offset="0.5" stopColor="#F1F3F5" />
          <Stop offset="1" stopColor="#9AA1AA" />
        </LinearGradient>
      </Defs>

      {/* pedestal */}
      <Ellipse cx={64} cy={92} rx={56} ry={9} fill={green} opacity={0.18} />
      <Ellipse cx={64} cy={88} rx={50} ry={7} fill="#FFFFFF" opacity={0.9} />

      {/* leaves */}
      <Path d="M 96 62 C 98 36 112 18 126 10 C 128 34 116 54 96 62 Z" fill={green} opacity={0.85} />
      <Path d="M 96 62 C 104 44 112 30 122 18" stroke="#FFFFFF" strokeWidth={1.4} opacity={0.6} fill="none" />
      <Path d="M 14 70 C 8 50 14 32 28 20 C 36 40 30 60 14 70 Z" fill={green} opacity={0.6} />

      {/* serum bottle */}
      <Rect x={30} y={40} width={28} height={46} rx={7} fill="url(#glass)" />
      <Rect x={30} y={40} width={28} height={46} rx={7} fill="none" stroke={green} strokeOpacity={0.35} strokeWidth={1} />
      <Rect x={36} y={56} width={16} height={16} rx={3} fill="#FFFFFF" opacity={0.7} />
      <Rect x={38} y={30} width={12} height={12} rx={2} fill="url(#metal)" />
      <Rect x={39} y={14} width={10} height={18} rx={5} fill="#7C8B80" />
      <Rect x={41} y={16} width={3} height={13} rx={1.5} fill="#FFFFFF" opacity={0.35} />

      {/* jar */}
      <Rect x={64} y={64} width={40} height={24} rx={7} fill="url(#glass)" />
      <Rect x={64} y={64} width={40} height={24} rx={7} fill="none" stroke={green} strokeOpacity={0.35} strokeWidth={1} />
      <Rect x={61} y={55} width={46} height={11} rx={4} fill="url(#metal)" />
    </Svg>
  );
}
