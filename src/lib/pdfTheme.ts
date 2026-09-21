/**
 * Palette condivisa per tutte le stampe PDF.
 * Due modalità: "color" (brand arancione) e "bw" (scala di grigi
 * ottimizzata per stampanti in bianco e nero / fotocopie).
 */
export type PdfColorMode = 'color' | 'bw';
export type Rgb = [number, number, number];

export interface PdfPalette {
  mode: PdfColorMode;
  /** Colore d'accento (bande, badge, evidenze). */
  accent: Rgb;
  /** Testo principale / fondi scuri. */
  dark: Rgb;
  /** Testo secondario. */
  muted: Rgb;
  /** Bordi e righelli. */
  border: Rgb;
  /** Fondo delle righe alternate nelle tabelle. */
  rowAlt: Rgb;
  /** Valore positivo (efficienza alta). */
  positive: Rgb;
  /** Valore negativo (efficienza sotto zero). */
  negative: Rgb;
  /** Testo sopra l'accento. */
  onAccent: Rgb;
}

const COLOR: PdfPalette = {
  mode: 'color',
  accent: [249, 115, 22],
  dark: [17, 17, 19],
  muted: [120, 120, 125],
  border: [220, 220, 222],
  rowAlt: [248, 248, 250],
  positive: [20, 140, 60],
  negative: [200, 50, 40],
  onAccent: [255, 255, 255],
};

const BW: PdfPalette = {
  mode: 'bw',
  accent: [70, 70, 70],
  dark: [0, 0, 0],
  muted: [110, 110, 110],
  border: [170, 170, 170],
  rowAlt: [240, 240, 240],
  positive: [0, 0, 0],
  negative: [110, 110, 110],
  onAccent: [255, 255, 255],
};

export function getPdfPalette(mode: PdfColorMode = 'color'): PdfPalette {
  return mode === 'bw' ? BW : COLOR;
}

/** Sfuma un colore verso il bianco (0 = bianco, 1 = pieno). */
export function tint(color: Rgb, alpha: number): Rgb {
  const a = Math.max(0, Math.min(1, alpha));
  return [
    Math.round(255 - (255 - color[0]) * a),
    Math.round(255 - (255 - color[1]) * a),
    Math.round(255 - (255 - color[2]) * a),
  ];
}

/** Colore per tipo evento del calendario, coerente con i badge in app. */
export function eventTypeColor(type: string, mode: PdfColorMode): Rgb {
  if (mode === 'bw') {
    const greys: Record<string, Rgb> = {
      allenamento: [120, 120, 120],
      partita: [20, 20, 20],
      riunione: [160, 160, 160],
      torneo: [70, 70, 70],
      altro: [195, 195, 195],
    };
    return greys[type] ?? greys.altro;
  }
  const colors: Record<string, Rgb> = {
    allenamento: [59, 130, 246],
    partita: [239, 68, 68],
    riunione: [168, 85, 247],
    torneo: [249, 115, 22],
    altro: [130, 130, 135],
  };
  return colors[type] ?? colors.altro;
}
