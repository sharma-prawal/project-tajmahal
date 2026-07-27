import { TAJ_PROPORTIONS } from './tajProportions';

/** A fixed camera pose: exact position + look-at target, for deterministic screenshot comparison (Part 11). */
export interface ReviewView {
  id: string;
  label: string;
  position: [number, number, number];
  lookAt: [number, number, number];
}

const domeApex = TAJ_PROPORTIONS.dome.drumHeight + TAJ_PROPORTIONS.dome.apexHeight;
const midHeight = TAJ_PROPORTIONS.facade.height / 2;

/**
 * Six fixed development-only review views (Part 11), relative to the
 * bake-off slice's local origin (ground level, façade centered on Z=0).
 * `BakeoffReviewCamera` applies these as absolute world positions by
 * offsetting from the slice's mount point.
 */
export const BAKEOFF_REVIEW_VIEWS: ReviewView[] = [
  {
    id: 'frontal',
    label: '1. Frontal',
    position: [0, midHeight, 40],
    lookAt: [0, midHeight, 0],
  },
  {
    id: 'three-quarter-left',
    label: '2. Three-quarter left',
    position: [-28, midHeight, 28],
    lookAt: [0, midHeight, 0],
  },
  {
    id: 'side',
    label: '3. Side',
    position: [35, midHeight, 0],
    lookAt: [0, midHeight, 0],
  },
  {
    id: 'low-angle-dome',
    label: '4. Low-angle dome',
    position: [0, 2, 20],
    lookAt: [0, domeApex, 0],
  },
  {
    id: 'minaret-close-medium',
    label: '5. Minaret close-medium',
    position: [12, TAJ_PROPORTIONS.minaret.totalHeight * 0.4, 10],
    lookAt: [8, TAJ_PROPORTIONS.minaret.totalHeight * 0.5, 0],
  },
  {
    id: 'distant-silhouette',
    label: '6. Distant silhouette',
    position: [0, midHeight * 1.5, 100],
    lookAt: [0, domeApex * 0.5, 0],
  },
];
