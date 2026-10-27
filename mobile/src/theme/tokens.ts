// Mirrors frontend/src/shared/styles/_tokens.scss — the web app's Carbon-based
// palette, plus a dark variant for `userInterfaceStyle: automatic`.
export type Palette = {
  accent: string;
  accentDark: string;
  accentDeeper: string;
  accentMid: string;
  accentLight: string;
  accentBorder: string;
  accentMuted: string;

  canvas: string;
  layer: string;
  layerSelected: string;
  layerHover: string;

  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textDisabled: string;
  textOnColor: string;

  borderSubtle: string;
  borderStrong: string;

  danger: string;
  success: string;
  warning: string;
  warningText: string;

  chartPurple: string;
  chartBlue: string;
  chartPink: string;
  chartTeal: string;
  chartOrange: string;

  statusPresent: { bg: string; border: string; text: string };
  statusAbsent: { bg: string; border: string; text: string };
  statusLate: { bg: string; border: string; text: string };
  statusExcused: { bg: string; border: string; text: string };
};

export const palette: Palette = {
  accent: "#007D9C",
  accentDark: "#005F77",
  accentDeeper: "#004B5E",
  accentMid: "#1CB3D6",
  accentLight: "#E6F7FA",
  accentBorder: "#9DE5F3",
  accentMuted: "#0043CE",

  canvas: "#F4F4F4",
  layer: "#FFFFFF",
  layerSelected: "#E0E0E0",
  layerHover: "#F4F4F4",

  textPrimary: "#161616",
  textSecondary: "#393939",
  textTertiary: "#525252",
  textDisabled: "#8D8D8D",
  textOnColor: "#FFFFFF",

  borderSubtle: "#E0E0E0",
  borderStrong: "#C6C6C6",

  danger: "#DA1E28",
  success: "#198038",
  warning: "#F1C21B",
  warningText: "#161616",

  chartPurple: "#8A3FFC",
  chartBlue: "#0F62FE",
  chartPink: "#D02670",
  chartTeal: "#009D9A",
  chartOrange: "#FF832B",

  statusPresent: { bg: "#DEFBE6", border: "#198038", text: "#044317" },
  statusAbsent: { bg: "#FFF1F1", border: "#DA1E28", text: "#750E13" },
  statusLate: { bg: "#FFF8E1", border: "#F1C21B", text: "#161616" },
  statusExcused: { bg: "#F6F2FF", border: "#8A3FFC", text: "#31135E" },
} as const;

export const darkPalette: Palette = {
  ...palette,
  canvas: "#161616",
  layer: "#262626",
  layerSelected: "#393939",
  layerHover: "#333333",

  textPrimary: "#F4F4F4",
  textSecondary: "#D0D0D0",
  textTertiary: "#A8A8A8",
  textDisabled: "#6F6F6F",

  borderSubtle: "#393939",
  borderStrong: "#525252",

  accentLight: "#012A33",
  statusPresent: { bg: "#0B2E18", border: "#198038", text: "#A7F0BA" },
  statusAbsent: { bg: "#390A0D", border: "#DA1E28", text: "#FFB3B3" },
  statusLate: { bg: "#312B0A", border: "#F1C21B", text: "#F9DE8B" },
  statusExcused: { bg: "#1D1230", border: "#8A3FFC", text: "#D4BBFF" },
};

export const spacing = { xs: 4, s: 8, m: 16, l: 24, xl: 32 } as const;
export const radius = { s: 6, m: 10, l: 16 } as const;

export const splashBackground = palette.accent;
