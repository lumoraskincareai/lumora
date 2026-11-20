import React from "react";
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, Stop } from "react-native-svg";

// A friendly face-scan portrait drawn in code: no photo, no licence. `accent` is the theme colour.
export function HeroArt({ accent, width = 132, height = 156 }: { accent: string; width?: number; height?: number }) {
  const arm = 14;
  const corner = (x: number, y: number, dx: number, dy: number) =>
    `M ${x} ${y + dy * arm} L ${x} ${y} L ${x + dx * arm} ${y}`;
  const L = 10;
  const T = 14;
  const R = 122;
  const B = 144;

  return (
    <Svg width={width} height={height} viewBox="0 0 132 156">
      <Defs>
        <LinearGradient id="skin" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#F6D3B8" />
          <Stop offset="1" stopColor="#E3AE8B" />
        </LinearGradient>
        <LinearGradient id="hair" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#4A3040" />
          <Stop offset="1" stopColor="#2A1B2B" />
        </LinearGradient>
      </Defs>

      {/* soft glow */}
      <Circle cx={66} cy={78} r={62} fill={accent} opacity={0.1} />

      {/* hair behind the head */}
      <Path d="M 24 84 C 14 40 44 12 70 14 C 100 14 122 44 108 92 C 106 108 100 120 96 126 L 36 126 C 30 112 26 98 24 84 Z" fill="url(#hair)" />

      {/* neck and shoulders */}
      <Path d="M 54 112 L 54 132 C 54 142 40 146 28 152 L 104 152 C 92 146 78 142 78 132 L 78 112 Z" fill="url(#skin)" />
      <Path d="M 28 152 C 36 140 52 138 66 140 C 80 138 96 140 104 152 Z" fill={accent} opacity={0.85} />

      {/* face */}
      <Ellipse cx={66} cy={78} rx={33} ry={41} fill="url(#skin)" />

      {/* fringe */}
      <Path d="M 33 70 C 32 40 52 26 72 28 C 92 30 100 48 99 70 C 90 52 72 44 56 46 C 46 48 38 58 33 70 Z" fill="url(#hair)" />

      {/* closed eyes and smile */}
      <Path d="M 49 78 Q 54 83 60 78" stroke="#3A2230" strokeWidth={2.4} strokeLinecap="round" fill="none" />
      <Path d="M 72 78 Q 78 83 83 78" stroke="#3A2230" strokeWidth={2.4} strokeLinecap="round" fill="none" />
      <Path d="M 57 98 Q 66 106 76 98" stroke="#B2475F" strokeWidth={2.6} strokeLinecap="round" fill="none" />
      <Circle cx={46} cy={92} r={6} fill="#F08C8C" opacity={0.35} />
      <Circle cx={87} cy={92} r={6} fill="#F08C8C" opacity={0.35} />

      {/* scan mesh on the cheek */}
      <G opacity={0.6}>
        {[0, 1, 2, 3].map((i) => (
          <Line key={`v${i}`} x1={80 + i * 5} y1={86} x2={80 + i * 5} y2={112} stroke="#fff" strokeWidth={0.9} />
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <Line key={`h${i}`} x1={80} y1={86 + i * 6.5} x2={95} y2={86 + i * 6.5} stroke="#fff" strokeWidth={0.9} />
        ))}
      </G>

      {/* scan frame */}
      <Path d={corner(L, T, 1, 1)} stroke={accent} strokeWidth={3.5} strokeLinecap="round" fill="none" />
      <Path d={corner(R, T, -1, 1)} stroke={accent} strokeWidth={3.5} strokeLinecap="round" fill="none" />
      <Path d={corner(L, B, 1, -1)} stroke={accent} strokeWidth={3.5} strokeLinecap="round" fill="none" />
      <Path d={corner(R, B, -1, -1)} stroke={accent} strokeWidth={3.5} strokeLinecap="round" fill="none" />

      {/* sparkle */}
      <Path d="M 112 40 L 114.5 47 L 121.5 49.5 L 114.5 52 L 112 59 L 109.5 52 L 102.5 49.5 L 109.5 47 Z" fill="#F7C948" />
    </Svg>
  );
}
