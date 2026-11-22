/**
 * All tunable engine constants live here. Bump ENGINE_VERSION whenever a
 * calculation changes so cached daily summaries are recomputed.
 */
export const ENGINE_VERSION = 1;

export const MIN = 60_000;
export const HOUR = 3_600_000;
export const DAY = 86_400_000;

// ---- Sleep need (5.2) ----
export const NEED_DEFAULT_ADULT = 480;
export const NEED_DEFAULT_UNDER_18 = 540;
export const NEED_DEFAULT_18_25 = 495;
export const NEED_MIN = 360;
export const NEED_MAX = 630;
export const NEED_MIN_NIGHTS = 14;
export const NEED_RECOVERY_MIN_NIGHTS = 5;
export const NEED_LOOKBACK_DAYS = 90;
export const NEED_RECOVERY_MAX_DEBT_MIN = 180;
export const NEED_SMOOTH_OLD = 0.8;
export const NEED_SMOOTH_NEW = 0.2;
export const NEED_LATE_WAKE_HOUR = 9.5;

// ---- Sleep debt (5.3) ----
export const DEBT_DAYS = 14;
export const DEBT_W_MIN = 0.15;
export const NAP_WEIGHT = 0.75;
export const SURPLUS_FACTOR = 0.5;
export const DEBT_MAX_MISSING = 5;
export const DEBT_LOW_MAX = 300;
export const DEBT_MID_MAX = 600;
export const DEBT_GAUGE_MAX = 1200;

// ---- Sessions (5.1) ----
export const MERGE_GAP_MIN = 45;
export const NAP_MAX_MIN = 180;
export const NAP_START_HOUR = 9;
export const NAP_END_HOUR = 20;

// ---- Two-process model (5.4) ----
export const TAU_R_H = 18.2;
export const TAU_D_H = 4.2;
export const S_START = 0.3;
export const C_AMPLITUDE = 0.12;
/** Harmonic weights of process C. */
export const C_HARMONICS = [0.97, 0.22, 0.07, 0.03, 0.001];
/**
 * Reference phase. With x = PHI_REF - t the waveform rises slowly over ~16 h
 * and falls fast over ~8 h: minimum ~04:00, maximum ~20:00 (see DECISIONS.md).
 */
export const PHI_REF_H = 0;
export const REF_MIDSLEEP_H = 4;
/** Circadian gain and circasemidian (post-lunch dip) amplitude, calibrated numerically. */
export const C_GAIN = 2.5;
export const SEMIDIAN_AMP = 0.07;
export const SEMIDIAN_DIP_AFTER_MIN_H = 11.5;
export const I0 = 0.25;
export const TAU_I_H = 0.6;
export const INERTIA_DONE = 0.03;
export const DEBT_MALUS = 0.08;
export const DEBT_FACTOR_HOURS = 10;

// ---- Energy curve (5.5) ----
export const CURVE_STEP_MIN = 5;
/** Fixed normalisation range taken from a well rested reference day (see calibrate test). */
export const E_MIN_REF = -0.46;
export const E_MAX_REF = -0.17;
export const SMOOTH_MIN = 30;
export const WINDOW_TOLERANCE = 5;
export const WINDOW_MIN_MIN = 45;
export const WINDOW_MAX_MIN = 150;

// ---- Chronotype (5.6) ----
export const MSF_EARLY_MAX_H = 3;
export const MSF_LATE_MIN_H = 5;
export const OFFSET_LIMIT_MIN = 240;
export const OFFSET_MAX_WEEKLY_CHANGE_MIN = 15;
export const CHRONO_MIN_NIGHTS = 21;

// ---- Shift / jetlag (5.7) ----
export const ADAPT_MAX_PER_DAY_MIN = 60;

// ---- Windows (5.8) ----
export const SLEEP_ONSET_MIN = 15;
export const DEBT_PAYBACK_FRACTION = 0.15;
export const DEBT_PAYBACK_MAX_MIN = 60;
export const MELATONIN_LENGTH_MIN = 60;
export const DLMO_BEFORE_SLEEP_H = 2;
export const MELATONIN_AFTER_DLMO_H = 2;
export const MORNING_LIGHT_MIN = 60;
export const LAST_MEAL_BEFORE_BED_H = 3;
export const DIM_LIGHT_BEFORE_MELATONIN_MIN = 90;
export const WIND_DOWN_BEFORE_MELATONIN_MIN = 60;
export const NAP_SHORT_MIN = 20;
export const NAP_LONG_MIN = 90;
export const NAP_LATEST_BEFORE_BED_H = 7;
export const SPORT_LENGTH_MIN = 60;
export const SPORT_BEFORE_WIND_DOWN_H = 2;
export const BEDTIME_EARLY_LIMIT_MIN = 60;
export const DEFAULT_CAFFEINE_CUTOFF_H = 8;

/** Reference sleep onset (clock hour) of the reference chronotype; melatonin window starts here. */
export const HABITUAL_ONSET_REF_H = 22.5;
export const DEFAULT_WAKE_BEFORE_START_H = 8;
