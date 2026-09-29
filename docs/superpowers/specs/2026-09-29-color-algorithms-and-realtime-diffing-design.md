# Color Matching Algorithms & Realtime Dithering Diffing Specification

## 1. Overview & Objectives
Notecraft currently quantizes images using CIE76 Euclidean distance in $L^*a^*b^*$ color space and optionally applies Floyd-Steinberg error diffusion dithering. 

This specification expands Notecraft Studio with:
1. **Advanced Perceptual Color Matching Algorithms**:
   - **CIEDE2000 ($\Delta E_{00}$)**: The modern international gold standard for perceptual color difference, correcting human eye perceptual non-uniformities across chroma, hue, and neutral tones.
   - **Oklab ($\Delta E_{\text{Oklab}}$)**: A modern, computationally efficient perceptual color space designed by Björn Ottosson, delivering clean hue linearity and lightness uniformity.
   - **CIE76 ($\Delta E_{76}$)**: Maintained as the fast, classic Euclidean baseline in CIELAB space.
2. **Multiple Dithering & Texture Algorithms**:
   - **None**: Flat, clean solid color blocks without error diffusion.
   - **Floyd-Steinberg**: The classic 4-neighbor error diffusion distributing 100% of quantization error for smooth photorealistic shading.
   - **Atkinson**: Bill Atkinson's classic Mac/HyperCard diffusion kernel, diffusing 6/8 of error across 6 neighbors while preserving 2/8 (25%) damping for high-contrast edges and crisp highlights.
   - **Bayer 4×4 (Ordered Dither)**: A deterministic spatial matrix threshold modulation that creates a distinctive retro 8-bit comic / halftone texture without directional error bleeding.
3. **Realtime 1-Click Diffing UX**:
   - 1-click segmented pill bars directly above the mosaic surface (`RenderingControls`), avoiding hidden dropdowns.
   - Instant re-rendering (<5ms on typical sticky note grids) so users can rapidly flip between algorithms and immediately see visual diffs on screen.
   - A dedicated **"Quick Compare" (⇄)** button allowing users to toggle between current and previous algorithm selections with a single click.
   - Interactive **Dither Strength** slider (0% to 100%) that dynamically adjusts diffusion or matrix thresholding in real time.

---

## 2. Mathematical Foundations

### 2.1 Color Distance Metrics

#### A. CIEDE2000 ($\Delta E_{00}$)
Defined by the standard CIE formula (Sharma, Wu, Dalal 2005):
$$\Delta E_{00} = \sqrt{\left(\frac{\Delta L'}{k_L S_L}\right)^2 + \left(\frac{\Delta C'}{k_C S_C}\right)^2 + \left(\frac{\Delta H'}{k_H S_H}\right)^2 + R_T \left(\frac{\Delta C'}{k_C S_C}\right)\left(\frac{\Delta H'}{k_H S_H}\right)}$$
With standard parametric weighting factors $k_L = k_C = k_H = 1$:
- $\bar{L}' = (L_1 + L_2) / 2$
- $G = 0.5 \times (1 - \sqrt{\bar{C}_{ab}^7 / (\bar{C}_{ab}^7 + 25^7)})$
- $a'_i = (1 + G) a_i$
- $C'_i = \sqrt{{a'_i}^2 + b_i^2}$, $\bar{C}' = (C'_1 + C'_2) / 2$
- $h'_i = \text{atan2}(b_i, a'_i)$ (converted to degrees in $[0, 360)$)
- $\Delta L' = L_2 - L_1$, $\Delta C' = C'_2 - C'_1$
- $\Delta H' = 2 \sqrt{C'_1 C'_2} \sin(\Delta h' / 2)$ where $\Delta h'$ is the shortest circular distance between $h'_1$ and $h'_2$
- $S_L = 1 + \frac{0.015 (\bar{L}' - 50)^2}{\sqrt{20 + (\bar{L}' - 50)^2}}$
- $S_C = 1 + 0.045 \bar{C}'$
- $S_H = 1 + 0.015 \bar{C}' T$, where $T = 1 - 0.17 \cos(\bar{h}' - 30^\circ) + 0.24 \cos(2\bar{h}') + 0.32 \cos(3\bar{h}' + 6^\circ) - 0.20 \cos(4\bar{h}' - 63^\circ)$
- Rotation function $R_T = -2 \sqrt{\frac{\bar{C}'^7}{\bar{C}'^7 + 25^7}} \sin\left(60^\circ \exp\left(-\left(\frac{\bar{h}' - 275^\circ}{25^\circ}\right)^2\right)\right)$

#### B. Oklab ($\Delta E_{\text{Oklab}}$)
Linear sRGB $(r, g, b) \in [0, 1]$ converted to cone responses $L, M, S$:
$$\begin{bmatrix} l \\ m \\ s \end{bmatrix} = \begin{bmatrix} 0.4122214708 & 0.5363325363 & 0.0514459929 \\ 0.2119034982 & 0.6806995451 & 0.1073969566 \\ 0.0883024619 & 0.2817188376 & 0.6260277005 \end{bmatrix} \begin{bmatrix} r_{\text{lin}} \\ g_{\text{lin}} \\ b_{\text{lin}} \end{bmatrix}$$
Non-linear cube root transformation:
$$l' = \sqrt[3]{l}, \quad m' = \sqrt[3]{m}, \quad s' = \sqrt[3]{s}$$
Oklab coordinates $(L, a, b)$:
$$\begin{bmatrix} L \\ a \\ b \end{bmatrix} = \begin{bmatrix} 0.2104542553 & 0.7936177850 & -0.0040720468 \\ 1.9779984951 & -2.4285922050 & 0.4505937099 \\ 0.0259040371 & 0.7827717662 & -0.8086757660 \end{bmatrix} \begin{bmatrix} l' \\ m' \\ s' \end{bmatrix}$$
Perceptual distance:
$$\Delta E_{\text{Oklab}} = \sqrt{(L_1 - L_2)^2 + (a_1 - a_2)^2 + (b_1 - b_2)^2}$$

#### C. CIE76 ($\Delta E_{76}$)
Existing Euclidean distance in CIELAB space:
$$\Delta E_{76} = \sqrt{(L_1 - L_2)^2 + (a_1 - a_2)^2 + (b_1 - b_2)^2}$$

---

### 2.2 Dithering Kernels

#### A. Floyd-Steinberg Dithering
Diffuses full error across 4 neighbors:
```
        [ * ]   7/16
 3/16   5/16   1/16
```
Scaled by user-controlled `ditherStrength` ($s \in [0, 1]$):
$$\text{err}_{\text{diff}} = (\text{inputRGB} - \text{matchedRGB}) \times s$$

#### B. Atkinson Dithering
Diffuses $1/8$ of error across 6 neighbors:
```
        [ * ]   1/8   1/8
 1/8    1/8    1/8
        1/8
```
Notice total distributed fraction is $6 \times \frac{1}{8} = \frac{3}{4} = 75\%$. The remaining $25\%$ is deliberately discarded (damped), resulting in crisp boundaries and high-contrast highlights.

#### C. Bayer 4×4 Ordered Dithering
Deterministic spatial threshold matrix applied to normalized RGB values $[0, 255]$:
$$B_4 = \frac{1}{16} \begin{bmatrix} 0 & 8 & 2 & 10 \\ 12 & 4 & 14 & 6 \\ 3 & 11 & 1 & 9 \\ 15 & 7 & 13 & 5 \end{bmatrix} - 0.5$$
Threshold adjustment for pixel at coordinate $(c, r)$ with strength $s$:
$$\text{offset} = B_4[r \bmod 4][c \bmod 4] \times 255 \times s \times 0.5$$
$$\text{adjustedRGB} = \text{clamp}(\text{sampledRGB} + \text{offset}, 0, 255)$$
Color matching is then performed against `adjustedRGB` without error propagation.

---

## 3. Data Structures & Types (`src/types/mosaic.ts`)

```typescript
export type ColorMatchAlgorithm = 'ciede2000' | 'oklab' | 'cie76';

export type DitherAlgorithm = 'none' | 'floyd-steinberg' | 'atkinson' | 'bayer';

export interface StickyColor {
  id: string;
  name: string;
  hex: string;
  lab: [number, number, number];
  oklab?: [number, number, number]; // cached Oklab representation
  symbol: string;
  packId: string;
}

export interface MosaicProjectData {
  version: string;
  timestamp: string;
  dimensions: MosaicDimensions;
  activeBundleId: string;
  combinedBundleIds: string[];
  colorAlgorithm: ColorMatchAlgorithm;
  ditherAlgorithm: DitherAlgorithm;
  ditherStrength: number;
  enableDither?: boolean; // legacy compatibility
  imageUrl?: string | null;
  bom?: any;
}
```

---

## 4. Component & UI Architecture

### 4.1 Rendering Controls (`src/components/studio/RenderingControls.tsx`)
A dedicated toolbar positioned directly above Surface 2 (Mosaic Surface) that provides:
1. **Color Distance Segmented Pill Group**:
   - `[CIEDE2000]` | `[Oklab]` | `[CIE76]`
   - Tooltip/subtitle explaining each:
     - CIEDE2000: "Perceptual CIE standard"
     - Oklab: "Linear hue & lightness"
     - CIE76: "Classic Euclidean"
2. **Dither Style Segmented Pill Group**:
   - `[None]` | `[Floyd-Steinberg]` | `[Atkinson]` | `[Bayer 4×4]`
3. **Dither Strength Slider**:
   - Displayed when `ditherAlgorithm !== 'none'`. Range: `0%` to `100%`, step `5%`.
4. **Quick Compare (⇄) Button**:
   - Allows users to instantly toggle between their currently selected algorithm and the previous selection to immediately spot subtle color difference changes.

### 4.2 State Management (`src/hooks/useMosaicStudio.ts`)
- Maintains `colorAlgorithm`, `setColorAlgorithm`, `ditherAlgorithm`, `setDitherAlgorithm`, `ditherStrength`, `setDitherStrength`.
- Realtime memoization: `generateMosaicGrid` executes with active `colorAlgorithm`, `ditherAlgorithm`, and `ditherStrength`.
- Backward compatibility: Legacy projects with `enableDither: boolean` are automatically normalized:
  - `enableDither: true` $\to$ `ditherAlgorithm: 'floyd-steinberg'`
  - `enableDither: false` $\to$ `ditherAlgorithm: 'none'`
  - Default `colorAlgorithm: 'ciede2000'` for new designs; fallback to `'cie76'` if loading an exact legacy save.

---

## 5. Performance Strategy
- **Palette Pre-Computation**: When palette bundles change, pre-cache `rgb`, `lab`, and `oklab` tuples on all active `StickyColor` items.
- **Zero-Allocation Inner Loops**: During dithering error diffusion, operate directly on mutable numbers without object allocations.
- **Sub-5ms Execution**: For typical grids ($24 \times 16$ to $60 \times 40 = 384$ to $2400$ cells), calculations execute in 2–4ms, providing instantaneous 60fps re-renders during pill clicks and slider drags.

---

## 6. Verification & Test Plan
1. **Unit Tests (`tests/lib/colorScience.test.ts`)**:
   - CIEDE2000 mathematical verification with standard CIE test coordinates and symmetry ($\Delta E_{00}(A, B) = \Delta E_{00}(B, A)$).
   - Oklab RGB-to-Oklab and Euclidean distance verification.
   - `findClosestColor` respecting `ciede2000`, `oklab`, and `cie76`.
2. **Engine Tests (`tests/lib/mosaicEngine.test.ts`)**:
   - Atkinson error distribution: 6 neighbors receiving $1/8$ error with $25\%$ damping.
   - Bayer 4×4 deterministic threshold modulation.
   - None mode verifying no neighboring pixel error bleed.
3. **Hook Tests (`tests/hooks/useMosaicStudio.test.ts`)**:
   - State updating on algorithm change.
   - Legacy project import migration.
4. **Component Tests (`tests/components/RenderingControls.test.tsx`)**:
   - Render all segmented pill options.
   - Verify 1-click active state toggling and slider interaction.
5. **Integration Tests (`tests/integration/studioPage.test.tsx`)**:
   - Verify page integration, BOM updates, and save/load persistence.
