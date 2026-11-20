import React from "react";
import Svg, { Circle, G, Path, Rect } from "react-native-svg";
import { iconColors } from "../../../src/theme/iconColors";

export type TileKind = "routine" | "match" | "review" | "community";

const sparkle = (cx: number, cy: number, r: number) =>
  `M ${cx} ${cy - r} L ${cx + r * 0.28} ${cy - r * 0.28} L ${cx + r} ${cy} L ${cx + r * 0.28} ${cy + r * 0.28} L ${cx} ${cy + r} L ${cx - r * 0.28} ${cy + r * 0.28} L ${cx - r} ${cy} L ${cx - r * 0.28} ${cy - r * 0.28} Z`;

// Small illustrations for the four action tiles, all 48x48.
export function TileArt({ kind, size = 48 }: { kind: TileKind; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      {kind === "routine" ? <Routine /> : null}
      {kind === "match" ? <Match /> : null}
      {kind === "review" ? <Review /> : null}
      {kind === "community" ? <Community /> : null}
    </Svg>
  );
}

function Routine() {
  const c = iconColors.pink;
  return (
    <G>
      <Rect x={7} y={10} width={34} height={32} rx={8} fill="#FFFFFF" stroke={c} strokeWidth={2.2} />
      <Path d="M 7 20 L 41 20 L 41 18 C 41 13 37 10 33 10 L 15 10 C 11 10 7 13 7 18 Z" fill={c} />
      <Rect x={15} y={5} width={4} height={9} rx={2} fill={c} />
      <Rect x={29} y={5} width={4} height={9} rx={2} fill={c} />
      <Path d="M 16 31 L 22 37 L 33 26" stroke={c} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Circle cx={39} cy={9} r={5} fill={iconColors.amber} />
    </G>
  );
}

function Match() {
  const c = iconColors.teal;
  return (
    <G>
      <Path d="M 9 17 L 39 17 L 41 40 C 41 42 40 43 38 43 L 10 43 C 8 43 7 42 7 40 Z" fill="#FFFFFF" stroke={c} strokeWidth={2.2} strokeLinejoin="round" />
      <Path d="M 17 22 L 17 14 C 17 9 20 6 24 6 C 28 6 31 9 31 14 L 31 22" stroke={c} strokeWidth={2.6} strokeLinecap="round" fill="none" />
      <Rect x={20} y={27} width={8} height={11} rx={2.5} fill={c} opacity={0.25} />
      <Rect x={22} y={24} width={4} height={4} rx={1} fill={c} />
      <Path d={sparkle(38, 12, 6)} fill={iconColors.amber} />
    </G>
  );
}

function Review() {
  const c = iconColors.amber;
  const star = (cx: number, cy: number, r: number) => {
    const pts: string[] = [];
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 === 0 ? r : r * 0.45;
      const a = (Math.PI / 5) * i - Math.PI / 2;
      pts.push(`${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`);
    }
    return `M ${pts.join(" L ")} Z`;
  };
  return (
    <G>
      <Path d={star(22, 24, 18)} fill={c} stroke="#FFFFFF" strokeWidth={1.5} strokeLinejoin="round" />
      <Path d={star(22, 24, 9)} fill="#FFFFFF" opacity={0.35} />
      <Path d={star(39, 11, 6)} fill={iconColors.pink} />
      <Path d={star(8, 40, 4.5)} fill={c} opacity={0.6} />
    </G>
  );
}

function Community() {
  const c = iconColors.purple;
  return (
    <G>
      <Circle cx={24} cy={16} r={7.5} fill={c} />
      <Path d="M 10 42 C 10 31 16 26 24 26 C 32 26 38 31 38 42 Z" fill={c} />
      <Circle cx={10} cy={20} r={5.5} fill={iconColors.pink} opacity={0.85} />
      <Path d="M 0 40 C 0 32 4 28 10 28 C 12 28 14 29 15 30 C 11 33 10 37 10 40 Z" fill={iconColors.pink} opacity={0.85} />
      <Circle cx={38} cy={20} r={5.5} fill={iconColors.teal} opacity={0.85} />
      <Path d="M 48 40 C 48 32 44 28 38 28 C 36 28 34 29 33 30 C 37 33 38 37 38 40 Z" fill={iconColors.teal} opacity={0.85} />
    </G>
  );
}
