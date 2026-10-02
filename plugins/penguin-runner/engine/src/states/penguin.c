#pragma bank 255
#include "states/penguin.h"
#include "states/penguin_font.h"
#include "states/penguin_mode.h"
#include "actor.h"
#include "camera.h"
#include "scroll.h"
#include "input.h"
#include "ui.h"
#include "macro.h"
#include "math.h"
#include "music_manager.h"
#include "penguin_music.h"
#include "palette.h"
#include "fade_manager.h"
#include "vm.h"
#include <string.h>

BANKREF_EXTERN(pj_menu_script)
extern const UBYTE pj_menu_script[];

// Project-local GB Studio 4.3.2 scene. Coordinates use 32 subpixels per pixel.
#define PJ_GROUND PX_TO_SUBPX(112)
#define PJ_FINISH PX_TO_SUBPX(1972)
#define PJ_ICE_COUNT 10
#define PJ_FISH_COUNT 60
#define PJ_STAR_FRAMES 480
#define PJ_BASE_SPEED 56
#define PJ_MAX_SPEED 84
#define PJ_BEAR 255
#define PJ_FLOAT 254
#define PJ_ICICLE 253
#define PJ_METEOR 252
#define PJ_BEAR_COUNT 2
#define PJ_ACTOR_LAST 20
#define PJ_FLOAT_TOP 80
#define PJ_FLOAT_BOTTOM 96
#define PJ_SNOW_Y 108
#define PJ_RUN 0
#define PJ_PAUSE 1
#define PJ_CLEAR 2
#define PJ_OVER 3
#define PJ_BLIZZARD 1
#define PJ_ICICLE_STORM 2
#define PJ_METEOR_STORM 4
INT16 penguin_velocity_y;
UWORD pj_rng, pj_courses, pj_fish, pj_best_courses, pj_best_fish;
UWORD pj_star, pj_phase_timer, pj_run_ticks;
UWORD pj_ice_x[PJ_ICE_COUNT], pj_fish_x[PJ_FISH_COUNT];
UBYTE pj_ice_h[PJ_ICE_COUNT], pj_fish_y[PJ_FISH_COUNT], pj_taken[PJ_FISH_COUNT];
UBYTE pj_phase, pj_progress, pj_speed, pj_jump_buffer, pj_was_airborne;
UBYTE pj_fish_head, pj_hud_dirty, pj_last_seconds;
UBYTE pj_hole_w[PJ_ICE_COUNT], pj_falling, pj_jumps;
UBYTE pj_gauge_pixels, pj_motion_accum;
UWORD pj_bear_x[PJ_BEAR_COUNT];
UBYTE pj_bear_index[PJ_BEAR_COUNT], pj_bear_right[PJ_BEAR_COUNT];
UBYTE pj_bear_alive[PJ_BEAR_COUNT], pj_bear_squash[PJ_BEAR_COUNT];
UWORD pj_stomps;
UWORD pj_snow_x[PJ_BEAR_COUNT], pj_snow_thrown;
UBYTE pj_snow_active[PJ_BEAR_COUNT], pj_bear_windup[PJ_BEAR_COUNT];
UBYTE pj_bear_cooldown[PJ_BEAR_COUNT], pj_bear_throw_pose[PJ_BEAR_COUNT];
// Retain the actual collision cause for source-level playtest diagnostics.
UBYTE pj_death_cause;
UWORD pj_icicle_y[3], pj_icicle_drops;
INT16 pj_icicle_velocity[3];
UBYTE pj_icicle_state[3], pj_icicle_timer[3], pj_icicle_clock;
UBYTE pj_icicle_count, pj_icicle_next, pj_icicle_index[3];
UBYTE pj_bear_black[PJ_BEAR_COUNT], pj_black_fired;
UWORD pj_hammer_x, pj_hammer_thrown;
INT16 pj_hammer_y, pj_hammer_velocity;
UBYTE pj_hammer_active, pj_hammer_age, pj_hammer_clock;
UWORD pj_meteor_x[3], pj_meteor_drops;
INT16 pj_meteor_y[3];
UBYTE pj_meteor_index, pj_meteor_state[3], pj_meteor_timer[3], pj_meteor_clock, pj_meteor_age[3];
UBYTE pj_weather, pj_icicle_volley, pj_meteor_volley, pj_sky_tile, pj_snow_frame;
static UBYTE pj_sky_normal[16];
static palette_entry_t pj_clear_bkg[7], pj_clear_obj[7];
static far_ptr_t pj_snow_sprite;
static UBYTE pj_snow_base_tile;
// Difficulty advances independently of the number of courses actually cleared.
UWORD pj_level, pj_mode_best_courses[2], pj_mode_best_fish[2];
static UBYTE pj_row[20];
const TRACK_T *pj_star_track, *pj_normal_track;
UBYTE pj_star_bank, pj_normal_bank, pj_music_star;
extern uint8_t music_play_isr_pause;

static void pj_set_song(UBYTE star) {
    if (pj_music_star == star) return;
    pj_music_star = star;
    if (star) music_load(pj_star_bank, pj_star_track);
    else music_load(pj_normal_bank, pj_normal_track);
}

static void pj_pause_music(UBYTE pause) {
    // The engine's music_pause lacks BANKED linkage. Update its ISR flag locally.
    music_play_isr_pause = pause;
    if (pause) music_sound_cut();
}

static void tone(UBYTE lo, UBYTE hi) {
    NR52_REG = 0x80; NR50_REG = 0x77; NR51_REG |= 0x22;
    NR21_REG = 0x80; NR22_REG = 0x82; NR23_REG = lo; NR24_REG = hi | 0x80;
}
static UWORD random16(void) {
    pj_rng ^= pj_rng << 7; pj_rng ^= pj_rng >> 9; pj_rng ^= pj_rng << 8;
    return pj_rng;
}
static UBYTE roll_ten_percent(void) {
    UWORD n;
    // xorshift16 produces 1..65535. Reject the last five values for equal buckets.
    do { n = random16(); } while (n > 65530);
    return n % 10 == 0;
}
static UWORD snow_color(UWORD color) {
    // Stable white haze; no full-screen flashing. Keep the HUD palette intact.
    return RGB(20 + ((color & 31) >> 2),
               22 + (((color >> 5) & 31) >> 2),
               24 + (((color >> 10) & 31) >> 2));
}
static void apply_weather(void) {
    UBYTE i, j;
    UWORD *src, *dst;
    memcpy(BkgPalette, pj_clear_bkg, sizeof(pj_clear_bkg));
    memcpy(SprPalette, pj_clear_obj, sizeof(pj_clear_obj));
    if (pj_weather & PJ_BLIZZARD) {
        src = (UWORD *)pj_clear_bkg; dst = (UWORD *)BkgPalette;
        for (i = 0; i != 28; ++i) dst[i] = snow_color(src[i]);
        src = (UWORD *)pj_clear_obj; dst = (UWORD *)SprPalette;
        for (i = 0; i != 28; ++i) dst[i] = snow_color(src[i]);
        // Snow is white in the repeated empty-sky tile, against the hazy sky.
        for (j = 0; j != 7; ++j) BkgPalette[j].c0 = RGB(31, 31, 31);
    }
    VBK_REG = 0; set_bkg_data(pj_sky_tile, 1, pj_sky_normal);
    pj_snow_frame = 255;
    fade_applypalettechange();
}
static void update_blizzard(void) {
    UBYTE y, shift, bits, tile[16];
    if (!(pj_weather & PJ_BLIZZARD)) return;
    shift = (pj_run_ticks >> 2) & 7;
    if (pj_snow_frame == shift) return;
    pj_snow_frame = shift;
    // Reuse the sky tile rather than consuming the hardware sprite budget.
    // Two diagonal streaks travel across all copies of the tile.
    for (y = 0; y != 8; ++y) {
        bits = (y & 3) < 2 ? (UBYTE)(0x80 >> ((y + 8 - shift) & 7)) : 0;
        tile[y * 2] = pj_sky_normal[y * 2] & ~bits;
        tile[y * 2 + 1] = pj_sky_normal[y * 2 + 1] & ~bits;
    }
    VBK_REG = 0; set_bkg_data(pj_sky_tile, 1, tile);
}
static UBYTE glyph(UBYTE c) {
    if (c >= '0' && c <= '9') return 0xCD + c - '0';
    if (c >= 'A' && c <= 'Z') return 0xD7 + c - 'A';
    if (c == ':') return 0xF1;
    if (c == '/') return 0xF2;
    if (c == '-') return 0xF3;
    return 0xCC;
}
static void label(UBYTE col, const char *s) {
    while (*s && col < 20) pj_row[col++] = glyph(*s++);
}
static void number(UBYTE col, UWORD value, UBYTE digits) {
    col += digits;
    do { pj_row[--col] = glyph('0' + value % 10); value /= 10; } while (--digits);
}
static void row(UBYTE y) {
    VBK_REG = 0; set_win_tiles(0, y, 20, 1, pj_row);
    memset(pj_row, 0xCC, sizeof(pj_row));
}
static void hud(void) {
    UBYTE i, filled;
    memset(pj_row, 0xCC, sizeof(pj_row));
    if (pj_phase == PJ_RUN) {
        ui_set_pos(7, 128);
        label(0, "C:"); number(2, pj_courses, 4);
        if (pj_weather) {
            label(8, pj_game_mode == PJ_MODE_HARD ? "H" : "N");
            if (pj_weather & PJ_BLIZZARD) label(10, "S");
            if (pj_weather & PJ_ICICLE_STORM) label(12, "I");
            if (pj_weather & PJ_METEOR_STORM) label(14, "M");
        } else label(8, pj_game_mode == PJ_MODE_HARD ? "HARD" : "NORMAL");
        label(16, "J:"); number(18, 2 - pj_jumps, 1); row(0);
        if (pj_star) {
            label(0, "STAR");
            pj_gauge_pixels = (pj_star + 5) / 6;
            number(17, (pj_star + 59) / 60, 1); label(18, "S");
        } else {
            label(0, "FISH");
            pj_gauge_pixels = (UWORD)pj_progress * 4 / 5;
        }
        pj_row[5] = 0xFD; pj_row[16] = 0xFE;
        for (i = 0; i != 10; ++i) {
            filled = pj_gauge_pixels > i * 8 ? pj_gauge_pixels - i * 8 : 0;
            pj_row[6 + i] = 0xF4 + (filled > 8 ? 8 : filled);
        }
        row(1);
    } else {
        // Result/pause panels must remain opaque to gameplay sprites.
        for (i = 0; i <= PJ_ACTOR_LAST; ++i) SET_FLAG(actors[i].flags, ACTOR_FLAG_HIDDEN);
        ui_set_pos(7, 64);
        for (i = 0; i != 10; ++i) row(i);
        label(2, pj_phase == PJ_OVER ? "GAME OVER" : pj_phase == PJ_PAUSE ? "PAUSED" : "COURSE CLEAR"); row(1);
        label(2, pj_game_mode == PJ_MODE_HARD ? "MODE: HARD" : "MODE: NORMAL"); row(2);
        label(2, "CLEARED"); number(10, pj_courses, 4); row(3);
        label(2, "FISH"); number(10, pj_fish, 5); row(4);
        if (pj_weather & PJ_BLIZZARD) label(1, "SNOW");
        if (pj_weather & PJ_ICICLE_STORM) label(6, "ICE");
        if (pj_weather & PJ_METEOR_STORM) label(10, "METEOR");
        row(5);
        if (pj_phase == PJ_OVER) {
            label(1, "BEST"); number(6, pj_best_courses, 4); label(11, "F"); number(12, pj_best_fish, 5); row(6);
            label(2, "A: RETRY"); row(7);
            label(2, "B: MENU"); row(8);
        } else {
            label(2, pj_phase == PJ_PAUSE ? "A: RESUME" : "NEXT COURSE..."); row(7);
        }
    }
    pj_hud_dirty = 0; pj_last_seconds = (pj_star + 59) / 60;
}
// The gauge shrinks one pixel every six updates; change only its boundary tile.
static void refresh_hud(void) {
    UBYTE pixels, tile;
    if (pj_hud_dirty) { hud(); return; }
    if (!pj_star) return;
    pixels = (pj_star + 5) / 6;
    if (pixels == pj_gauge_pixels) return;
    tile = 0xF4 + (pixels & 7);
    VBK_REG = 0; set_win_tiles(6 + (pixels >> 3), 1, 1, 1, &tile);
    pj_gauge_pixels = pixels;
}
static void generate_course(void) {
    UBYTE i, j, hole, k = 0, candidates[3], middle = 5;
    UWORD x;
    pj_level = pj_courses + (pj_game_mode == PJ_MODE_HARD ? 19 : 0);
    // 160..192 px spacing leaves landing room after a double jump.
    for (i = 0; i != PJ_ICE_COUNT; ++i) {
        pj_ice_x[i] = 208 + (UWORD)i * 176 + ((random16() % 3) << 3);
        pj_ice_h[i] = (random16() & 1) ? 24 : 16;
        pj_hole_w[i] = 0;
    }
    // Four randomized pairs each contain a gap; obstacle zero teaches one jump.
    for (i = 0; i != 4; ++i) {
        hole = 1 + i * 2 + (random16() & 1);
        pj_ice_h[hole] = 0;
        if (i == 0) {
            pj_hole_w[hole] = pj_level < 2 ? 56 : 64;
            pj_ice_h[hole == 1 ? 2 : 1] = 48;
        } else {
            j = random16() % (pj_level < 2 ? 3 : 4);
            pj_hole_w[hole] = j == 0 ? 32 : j == 1 ? 40 : j == 2 ? 56 : 64;
        }
    }
    pj_ice_h[9] = pj_level < 2 ? 48 : 56;
    // Use the first and last safe platform pairs, leaving room after a bounce.
    // Their separation also prevents two wide bear sprites crowding a scanline.
    j = 1;
    for (i = 3, hole = 0, k = 0; i != 9; ++i) {
        if (pj_hole_w[i]) continue;
        if (hole++ == j) continue;
        pj_ice_h[i] = PJ_BEAR;
        pj_bear_index[k] = i;
        pj_bear_x[k] = PX_TO_SUBPX(pj_ice_x[i] - 16 + random16() % 33);
        pj_bear_right[k] = random16() & 1;
        pj_bear_alive[k] = 1; pj_bear_squash[k] = 0;
        pj_bear_black[k] = 0;
        pj_snow_active[k] = pj_bear_windup[k] = 0;
        pj_bear_cooldown[k] = pj_bear_throw_pose[k] = 0;
        ++k;
    }
    // Replace the safe platform in the middle pair with a low ceiling.
    // It never overlaps a pit, a bear patrol, or a required jump.
    for (i = 5; i != 7; ++i) {
        if (!pj_hole_w[i]) { pj_ice_h[i] = PJ_FLOAT; middle = i; }
    }
    // Choose 1..3 of the opening, middle and final hazard slots, then sort them.
    // Replacement, not insertion, preserves the recovery space around each slot.
    pj_icicle_count = pj_icicle_next = 0;
    if (pj_level >= 9) {
        candidates[0] = 0; candidates[1] = middle; candidates[2] = 9;
        pj_icicle_count = 1 + random16() % 3;
        for (i = 2; i; --i) {
            j = random16() % (i + 1); hole = candidates[i]; candidates[i] = candidates[j]; candidates[j] = hole;
        }
        for (i = 0; i != pj_icicle_count; ++i) pj_icicle_index[i] = candidates[i];
        for (i = 0; i != pj_icicle_count; ++i) {
            for (j = i + 1; j < pj_icicle_count; ++j) {
                if (pj_icicle_index[j] < pj_icicle_index[i]) {
                    hole = pj_icicle_index[i]; pj_icicle_index[i] = pj_icicle_index[j]; pj_icicle_index[j] = hole;
                }
            }
            pj_ice_h[pj_icicle_index[i]] = PJ_ICICLE;
        }
    }
    for (i = 0; i != 3; ++i) {
        pj_icicle_y[i] = PX_TO_SUBPX(24); pj_icicle_velocity[i] = 0;
        pj_icicle_state[i] = pj_icicle_timer[i] = 0;
    }
    pj_icicle_clock = 0;
    // Stage fifteen changes one existing bear encounter to a hammer encounter.
    // The other bear still throws snow. Never mix both shots in the same slot.
    if (pj_level >= 14) {
        i = random16() & 1; pj_bear_black[i] = 1;
        pj_bear_x[i] = PX_TO_SUBPX(pj_ice_x[pj_bear_index[i]]);
        pj_bear_right[i] = 0;
    }
    pj_black_fired = pj_hammer_active = pj_hammer_age = pj_hammer_clock = 0;
    pj_hammer_x = 0; pj_hammer_y = pj_hammer_velocity = 0;
    // Stage twenty replaces the safe tall-ice slot in the first pair.
    // Keep all four pits and reserve a whole encounter for this diagonal shot.
    pj_meteor_index = 255;
    if (pj_level >= 19) {
        pj_meteor_index = pj_hole_w[1] ? 2 : 1;
        pj_ice_h[pj_meteor_index] = PJ_METEOR;
    }
    for (i = 0; i != 3; ++i) {
        pj_meteor_state[i] = pj_meteor_timer[i] = pj_meteor_age[i] = 0;
        pj_meteor_x[i] = 0; pj_meteor_y[i] = 0;
    }
    pj_meteor_clock = 0;
    // Roll only after the ordinary layout is complete. No obstacle is replaced
    // or removed by a storm. HARD's first course has stage-twenty difficulty.
    pj_weather = 0;
    if (pj_level >= 19) {
        if (roll_ten_percent()) pj_weather |= PJ_BLIZZARD;
        if (roll_ten_percent()) pj_weather |= PJ_ICICLE_STORM;
        if (roll_ten_percent()) pj_weather |= PJ_METEOR_STORM;
    }
    pj_icicle_volley = pj_weather & PJ_ICICLE_STORM ? 3 : 1;
    pj_meteor_volley = pj_weather & PJ_METEOR_STORM ? 3 : 1;
    apply_weather();
    k = 0;
    // Fish trace the first and second arcs, rewarding the harder route.
    for (i = 0; i != PJ_ICE_COUNT; ++i) {
        x = pj_ice_x[i];
        for (j = 0; j != 6; ++j, ++k) {
            // Keep falling-hazard fish at walking height so their arc gives no warning.
            if (pj_ice_h[i] == PJ_FLOAT || pj_ice_h[i] == PJ_ICICLE || pj_ice_h[i] == PJ_METEOR) {
                pj_fish_x[k] = x - 96 + (UWORD)j * 24 + (j >= 3 ? 8 : 0);
                pj_fish_y[k] = 112;
            } else if (pj_ice_h[i] < PJ_METEOR && pj_ice_h[i] >= 48) {
                pj_fish_x[k] = j < 3 ? x - 104 + (UWORD)j * 24 : x - 32 + (UWORD)(j - 3) * 32;
                pj_fish_y[k] = j < 3 ? 112 : j == 3 ? 72 : j == 4 ? 40 : 56;
            } else if (pj_hole_w[i] >= 56) {
                pj_fish_x[k] = j < 3 ? x - 96 + (UWORD)j * 24 : j == 3 ? x - 8 : j == 4 ? x + 24 : x + pj_hole_w[i] - 8;
                pj_fish_y[k] = j < 3 ? 112 : j == 3 ? 84 : j == 4 ? 64 : 40;
            } else {
                pj_fish_x[k] = x - 96 + (UWORD)j * 24 + (j >= 3 ? 8 : 0);
                pj_fish_y[k] = j < 3 ? 112 : (j == 4 ? 84 : 96);
            }
            pj_taken[k] = 0;
        }
    }
    pj_fish_head = 0;
    // Each clear adds 1/32 pixel per update, through 28 clears (1.5x initial).
    pj_speed = PJ_BASE_SPEED + (pj_level < PJ_MAX_SPEED - PJ_BASE_SPEED ? (UBYTE)pj_level : PJ_MAX_SPEED - PJ_BASE_SPEED);
    pj_music_rate = pj_speed;
    pj_motion_accum = 0;
    PLAYER.pos.x = PX_TO_SUBPX(32); PLAYER.pos.y = PJ_GROUND;
    penguin_velocity_y = 0; pj_jump_buffer = pj_was_airborne = pj_falling = pj_jumps = 0;
    pj_death_cause = 0;
    actor_set_dir(&PLAYER, DIR_RIGHT, TRUE);
    CLR_FLAG(PLAYER.flags, ACTOR_FLAG_HIDDEN | ACTOR_FLAG_DISABLED);
    pj_phase = PJ_RUN; pj_hud_dirty = 1;
}
static void new_run(void) {
    pj_pause_music(FALSE);
    // Title/retry timing contributes entropy; retries retain PRNG state.
    pj_rng ^= sys_time ^ ((UWORD)DIV_REG << 8) ^ 0x6D2B;
    if (!pj_rng) pj_rng = 0xACE1;
    pj_courses = pj_fish = pj_star = pj_run_ticks = pj_stomps = pj_snow_thrown = pj_icicle_drops = pj_hammer_thrown = pj_meteor_drops = 0; pj_progress = 0;
    pj_phase_timer = 0;
    pj_best_courses = pj_mode_best_courses[pj_game_mode];
    pj_best_fish = pj_mode_best_fish[pj_game_mode];
    pj_set_song(FALSE);
    generate_course();
}
// Cropped gap frames omit wholly invisible tiles: off-screen X still uses OAM.
static UBYTE pit_frame(UBYTE width, INT16 screen) {
    UBYTE skipped;
    if (screen <= -8) {
        skipped = (UBYTE)(-screen) >> 3;
        return (width == 64 ? 34 : width == 56 ? 22 : width == 40 ? 14 : 8) + skipped - 1;
    }
    if (screen + width >= 168) {
        skipped = (UBYTE)(screen + width - 160) >> 3;
        return (width == 64 ? 41 : width == 56 ? 28 : width == 40 ? 18 : 11) + skipped - 1;
    }
    return width == 64 ? 7 : width == 56 ? 6 : width == 40 ? 3 : 2;
}
static void render_objects(void) {
    UBYTE i, slot = 1;
    INT16 relative, screen;
    UWORD px = SUBPX_TO_PX(PLAYER.pos.x);
    actor_t *a;
    for (i = 1; i <= PJ_ACTOR_LAST; ++i) SET_FLAG(actors[i].flags, ACTOR_FLAG_HIDDEN);
    for (i = 0; i != PJ_ICE_COUNT && slot <= 2; ++i) {
        if (pj_ice_h[i] == PJ_BEAR || pj_ice_h[i] == PJ_ICICLE || pj_ice_h[i] == PJ_METEOR) continue;
        relative = pj_ice_x[i] - px;
        if (relative < -(INT16)(pj_hole_w[i] ? pj_hole_w[i] + 48 : 64) || relative > 144) continue;
        screen = (INT16)pj_ice_x[i] - (INT16)draw_scroll_x;
        if (pj_hole_w[i] && (screen >= 160 || screen + pj_hole_w[i] <= 0)) continue;
        a = &actors[slot++];
        a->pos.x = PX_TO_SUBPX(pj_ice_x[i]);
        // Keep metasprite tiles inside the editor canvas; place gaps below the feet.
        a->pos.y = pj_hole_w[i] ? PX_TO_SUBPX(128) : pj_ice_h[i] == PJ_FLOAT ? PX_TO_SUBPX(88) : PJ_GROUND;
        actor_set_frame_offset(a, pj_hole_w[i] ? pit_frame(pj_hole_w[i], screen) : (pj_ice_h[i] == 56 ? 5 : pj_ice_h[i] == 48 ? 4 : pj_ice_h[i] == 24 ? 1 : 0));
        CLR_FLAG(a->flags, ACTOR_FLAG_HIDDEN | ACTOR_FLAG_DISABLED);
    }
    slot = 3;
    for (i = pj_fish_head; i != PJ_FISH_COUNT && slot <= 10; ++i) {
        relative = pj_fish_x[i] - px;
        if (relative > 144) break;
        if (relative < -64 || pj_taken[i]) continue;
        screen = (INT16)pj_fish_x[i] - (INT16)draw_scroll_x;
        if (screen >= 160 || screen + 8 <= 0) continue;
        a = &actors[slot++];
        a->pos.x = PX_TO_SUBPX(pj_fish_x[i]); a->pos.y = PX_TO_SUBPX(pj_fish_y[i]);
        CLR_FLAG(a->flags, ACTOR_FLAG_HIDDEN | ACTOR_FLAG_DISABLED);
    }
    for (i = 0; i != PJ_BEAR_COUNT; ++i) {
        if (!pj_bear_alive[i] && !pj_bear_squash[i]) continue;
        screen = (INT16)SUBPX_TO_PX(pj_bear_x[i]) - (INT16)draw_scroll_x;
        if (screen >= 160 || screen + 24 <= 0) continue;
        a = &actors[pj_bear_black[i] ? 17 : 11 + i]; a->pos.x = pj_bear_x[i]; a->pos.y = PJ_GROUND;
        actor_set_frame_offset(a, !pj_bear_alive[i] ? 4 : pj_bear_windup[i] ? 5 : pj_bear_throw_pose[i] ? 6 : (pj_bear_right[i] ? 0 : 2) + ((pj_run_ticks >> 3) & 1));
        CLR_FLAG(a->flags, ACTOR_FLAG_HIDDEN | ACTOR_FLAG_DISABLED);
    }
    for (i = 0; i != PJ_BEAR_COUNT; ++i) {
        if (!pj_snow_active[i]) continue;
        screen = (INT16)SUBPX_TO_PX(pj_snow_x[i]) - (INT16)draw_scroll_x;
        if (screen >= 160 || screen + 8 <= 0) continue;
        a = &actors[13 + i]; a->pos.x = pj_snow_x[i]; a->pos.y = PX_TO_SUBPX(PJ_SNOW_Y);
        a->sprite = pj_snow_sprite; a->base_tile = pj_snow_base_tile;
        actor_set_frames(a, 0, 1);
        actor_set_frame_offset(a, 0);
        CLR_FLAG(a->flags, ACTOR_FLAG_HIDDEN | ACTOR_FLAG_DISABLED);
    }
    // The two former warning-marker actors share the already-loaded icicle art.
    for (i = 0; i != pj_icicle_volley; ++i) {
        if (pj_icicle_state[i] < 2 || pj_icicle_state[i] >= 5) continue;
        relative = pj_ice_x[pj_icicle_index[pj_icicle_next]] + (pj_icicle_volley == 3 ? (INT16)i * 16 - 16 : 0);
        screen = relative - (INT16)draw_scroll_x;
        if (screen >= 160 || screen + 16 <= 0) continue;
        a = &actors[i == 0 ? 15 : i == 1 ? 16 : 20];
        a->sprite = actors[15].sprite; a->base_tile = actors[15].base_tile;
        actor_set_frames(a, actors[15].frame_start, actors[15].frame_end);
        a->pos.x = PX_TO_SUBPX(relative); a->pos.y = pj_icicle_y[i];
        // Three full-width icicles exceed the scanline budget beside the fish.
        // The storm frames use one 8-pixel column each with the same silhouette height.
        actor_set_frame_offset(a, (pj_icicle_volley == 3 ? 2 : 0) + (pj_icicle_state[i] == 4 ? 1 : 0));
        CLR_FLAG(a->flags, ACTOR_FLAG_HIDDEN | ACTOR_FLAG_DISABLED);
    }
    if (pj_hammer_active && pj_hammer_y < PX_TO_SUBPX(120)) {
        screen = (INT16)SUBPX_TO_PX(pj_hammer_x) - (INT16)draw_scroll_x;
        if (screen < 160 && screen + 16 > 0) {
            a = &actors[18]; a->pos.x = pj_hammer_x; a->pos.y = pj_hammer_y;
            actor_set_frame_offset(a, (pj_hammer_age >> 2) & 3);
            CLR_FLAG(a->flags, ACTOR_FLAG_HIDDEN | ACTOR_FLAG_DISABLED);
        }
    }
    for (i = 0; i != pj_meteor_volley; ++i) {
        if (pj_meteor_state[i] != 2) continue;
        screen = (INT16)SUBPX_TO_PX(pj_meteor_x[i]) - (INT16)draw_scroll_x;
        if (screen < 160 && screen + 16 > 0 && pj_meteor_y[i] < PX_TO_SUBPX(120)) {
            // The meteor zone finishes before the bear's snowball zone begins.
            a = &actors[i == 0 ? 19 : 12 + i];
            a->sprite = actors[19].sprite; a->base_tile = actors[19].base_tile;
            actor_set_frames(a, actors[19].frame_start, actors[19].frame_end);
            a->pos.x = pj_meteor_x[i]; a->pos.y = pj_meteor_y[i];
            actor_set_frame_offset(a, (pj_meteor_age[i] >> 2) & 1);
            CLR_FLAG(a->flags, ACTOR_FLAG_HIDDEN | ACTOR_FLAG_DISABLED);
        }
    }
}
static void update_meteor(void) {
    UBYTE i;
    if (pj_meteor_index == 255) return;
    if (!pj_meteor_state[0]) {
        if (SUBPX_TO_PX(PLAYER.pos.x) + 112 < pj_ice_x[pj_meteor_index]) return;
        for (i = 0; i != pj_meteor_volley; ++i) {
            pj_meteor_state[i] = 1; pj_meteor_timer[i] = 24 + i * 8;
        }
    }
    pj_meteor_clock += pj_speed;
    while (pj_meteor_clock >= PJ_BASE_SPEED) {
        pj_meteor_clock -= PJ_BASE_SPEED;
        for (i = 0; i != pj_meteor_volley; ++i) {
            if (pj_meteor_state[i] == 1) {
                if (--pj_meteor_timer[i] == 0) {
                    pj_meteor_state[i] = 2;
                    pj_meteor_x[i] = PX_TO_SUBPX(pj_ice_x[pj_meteor_index] + 64 + i * 16);
                    pj_meteor_y[i] = PX_TO_SUBPX(16);
                    if (pj_meteor_drops != 65535) ++pj_meteor_drops;
                }
            } else if (pj_meteor_state[i] == 2) {
                pj_meteor_x[i] -= PX_TO_SUBPX(2);
                pj_meteor_y[i] += 80;
                ++pj_meteor_age[i];
                // The last of three shots still ends within this encounter.
                if (pj_meteor_y[i] >= PX_TO_SUBPX(120)) pj_meteor_state[i] = 3;
            }
        }
    }
}
static void update_icicle(void) {
    UWORD px;
    UBYTE i, finished = 1;
    if (!pj_icicle_count) return;
    for (i = 0; i != pj_icicle_volley; ++i) {
        if (pj_icicle_state[i] != 5) finished = 0;
    }
    if (finished) {
        if (pj_icicle_next + 1 == pj_icicle_count) return;
        ++pj_icicle_next;
        for (i = 0; i != pj_icicle_volley; ++i) {
            pj_icicle_y[i] = PX_TO_SUBPX(24); pj_icicle_velocity[i] = 0;
            pj_icicle_state[i] = pj_icicle_timer[i] = 0;
        }
        pj_icicle_clock = 0;
    }
    px = SUBPX_TO_PX(PLAYER.pos.x);
    if (!pj_icicle_state[0]) {
        if (px + 112 < pj_ice_x[pj_icicle_index[pj_icicle_next]]) return;
        for (i = 0; i != pj_icicle_volley; ++i) {
            pj_icicle_state[i] = 1; pj_icicle_timer[i] = 24 + i * 8;
        }
    }
    // Preserve the silent delay/fall timing and spacing at every speed.
    pj_icicle_clock += pj_speed;
    while (pj_icicle_clock >= PJ_BASE_SPEED) {
        pj_icicle_clock -= PJ_BASE_SPEED;
        for (i = 0; i != pj_icicle_volley; ++i) {
            if (pj_icicle_state[i] == 1) {
                if (--pj_icicle_timer[i] == 0) {
                    pj_icicle_state[i] = 2; pj_icicle_velocity[i] = 32;
                    if (pj_icicle_drops != 65535) ++pj_icicle_drops;
                }
            } else if (pj_icicle_state[i] == 2) {
                pj_icicle_velocity[i] += 12; pj_icicle_y[i] += pj_icicle_velocity[i];
                if (pj_icicle_y[i] >= PJ_GROUND) {
                    pj_icicle_y[i] = PJ_GROUND; pj_icicle_state[i] = 3; pj_icicle_timer[i] = 48;
                    tone(0x30, 0x04);
                }
            } else if (pj_icicle_state[i] == 3) {
                if (--pj_icicle_timer[i] == 0) { pj_icicle_state[i] = 4; pj_icicle_timer[i] = 10; }
            } else if (pj_icicle_state[i] == 4 && --pj_icicle_timer[i] == 0) pj_icicle_state[i] = 5;
            }
    }
}
static void update_bears(void) {
    UBYTE i, pace = pj_speed >> 2;
    UWORD low, high;
    INT16 ahead;
    for (i = 0; i != PJ_BEAR_COUNT; ++i) {
        if (!pj_bear_alive[i]) { if (pj_bear_squash[i]) --pj_bear_squash[i]; continue; }
        if (pj_bear_throw_pose[i]) --pj_bear_throw_pose[i];
        if (pj_bear_cooldown[i]) --pj_bear_cooldown[i];
        if (pj_bear_windup[i]) {
            if (--pj_bear_windup[i] == 0) {
                if (pj_bear_black[i]) {
                    pj_hammer_x = pj_bear_x[i] - PX_TO_SUBPX(8);
                    pj_hammer_y = PX_TO_SUBPX(96); pj_hammer_velocity = -160;
                    pj_hammer_active = 1; pj_hammer_age = pj_hammer_clock = 0;
                    pj_black_fired = 1;
                    if (pj_hammer_thrown != 65535) ++pj_hammer_thrown;
                } else {
                    pj_snow_x[i] = pj_bear_x[i] - PX_TO_SUBPX(8);
                    pj_snow_active[i] = 1;
                    if (pj_snow_thrown != 65535) ++pj_snow_thrown;
                }
                pj_bear_throw_pose[i] = 10;
                pj_bear_cooldown[i] = 90;
            }
            continue;
        }
        ahead = (INT16)SUBPX_TO_PX(pj_bear_x[i]) - (INT16)SUBPX_TO_PX(PLAYER.pos.x);
        if (pj_bear_black[i]) {
            // A fixed, isolated station: 28 px of visible windup before one arc.
            if (!pj_black_fired && ahead >= 48 && ahead <= 112) {
                pj_bear_windup[i] = (UBYTE)((UWORD)16 * PJ_BASE_SPEED / pj_speed);
            }
            continue;
        }
        // Course five is four clears. A visible raised snowball precedes every shot.
        if (pj_level >= 4 && !pj_bear_cooldown[i] && !pj_snow_active[i] && ahead >= 48 && ahead <= 112) {
            pj_bear_right[i] = 0; pj_bear_windup[i] = 12;
            continue;
        }
        low = PX_TO_SUBPX(pj_ice_x[pj_bear_index[i]] - 16);
        high = low + PX_TO_SUBPX(32);
        if (pj_bear_right[i]) {
            pj_bear_x[i] += pace;
            if (pj_bear_x[i] >= high) { pj_bear_x[i] = high; pj_bear_right[i] = 0; }
        } else {
            pj_bear_x[i] -= pace;
            if (pj_bear_x[i] <= low) { pj_bear_x[i] = low; pj_bear_right[i] = 1; }
        }
    }
}
static void update_snow(void) {
    UBYTE i;
    for (i = 0; i != PJ_BEAR_COUNT; ++i) {
        if (!pj_snow_active[i]) continue;
        // Match the course speed so the relative dodging distance stays stable.
        if (pj_snow_x[i] < pj_speed) { pj_snow_active[i] = 0; continue; }
        pj_snow_x[i] -= pj_speed;
        if (pj_snow_x[i] + PX_TO_SUBPX(64) < PLAYER.pos.x) pj_snow_active[i] = 0;
    }
}
static void update_hammer(void) {
    if (!pj_hammer_active) return;
    pj_hammer_clock += pj_speed;
    while (pj_hammer_clock >= PJ_BASE_SPEED && pj_hammer_active) {
        pj_hammer_clock -= PJ_BASE_SPEED;
        pj_hammer_x -= PX_TO_SUBPX(1);
        pj_hammer_velocity += 12; pj_hammer_y += pj_hammer_velocity;
        ++pj_hammer_age;
        // End the attack in this encounter, well before the next obstacle.
        if (pj_hammer_y >= PX_TO_SUBPX(128)) pj_hammer_active = 0;
    }
}
static void game_over(void) {
    pj_pause_music(TRUE);
    pj_phase = PJ_OVER; pj_phase_timer = 30;
    actor_set_anim_idle(&PLAYER); player_moving = FALSE;
    CLR_FLAG(PLAYER.flags, ACTOR_FLAG_HIDDEN);
    if (pj_courses > pj_best_courses || (pj_courses == pj_best_courses && pj_fish > pj_best_fish)) {
        pj_best_courses = pj_courses; pj_best_fish = pj_fish;
        pj_mode_best_courses[pj_game_mode] = pj_best_courses;
        pj_mode_best_fish[pj_game_mode] = pj_best_fish;
    }
    tone(0x20, 0x03); render_objects(); hud();
}
void penguin_init(void) BANKED {
    UBYTE i, attributes[20];
    // Pulse 2 belongs to gameplay SFX; the UGE uses pulse 1, wave and noise.
    music_global_mute_mask = MUSIC_CH_2;
    music_effective_mute = driver_set_mute_mask(MUSIC_CH_2);
    pj_normal_track = music_current_track;
    pj_normal_bank = music_current_track_bank;
    pj_music_star = FALSE;
    camera_settings = CAMERA_LOCK_X_FLAG;
    camera_offset_x = -32; camera_offset_y = 0;
    camera_deadzone_x = camera_deadzone_y = 0; camera_y = PX_TO_SUBPX(72);
    PLAYER.anim_tick = 7; CLR_FLAG(PLAYER.flags, ACTOR_FLAG_COLLISION);
    // The logo may leave PLAYER disabled after a distant death. load_scene()
    // then skips its activation, but player_init() has now cleared that flag.
    // Restore PLAYER as the list tail before the pool: rendering walks PLAYER.prev.
    activate_actor(&PLAYER);
    for (i = 1; i <= PJ_ACTOR_LAST; ++i) {
        SET_FLAG(actors[i].flags, ACTOR_FLAG_PERSISTENT);
        CLR_FLAG(actors[i].flags, ACTOR_FLAG_COLLISION);
        actors[i].anim_tick = 255; activate_actor(&actors[i]);
    }
    VBK_REG = 0; set_bkg_data(0xCC, 51, pj_font);
    memset(attributes, 0x87, sizeof(attributes)); VBK_REG = 1;
    for (i = 0; i != 10; ++i) set_win_tiles(0, i, 20, 1, attributes);
    VBK_REG = 0;
    memcpy(pj_clear_bkg, BkgPalette, sizeof(pj_clear_bkg));
    memcpy(pj_clear_obj, SprPalette, sizeof(pj_clear_obj));
    get_bkg_tiles(0, 0, 1, 1, &pj_sky_tile);
    get_bkg_data(pj_sky_tile, 1, pj_sky_normal);
    pj_snow_sprite = actors[13].sprite;
    pj_snow_base_tile = actors[13].base_tile;
    new_run(); render_objects(); hud();
}
void penguin_update(void) BANKED {
    UBYTE i, airborne;
    UWORD px, py, previous_foot, bx;
    INT16 dx, dy;
    if (pj_phase == PJ_PAUSE) {
        if (INPUT_A_PRESSED || INPUT_START_PRESSED) { pj_pause_music(FALSE); pj_phase = PJ_RUN; hud(); }
        return;
    }
    if (pj_phase == PJ_OVER) {
        if (pj_phase_timer) --pj_phase_timer;
        else if (INPUT_B_PRESSED) {
            pj_music_rate = PJ_BASE_SPEED;
            pj_set_song(FALSE); pj_pause_music(FALSE);
            ui_set_pos(7, MENU_CLOSED_Y);
            // Lock in a wait phase while the VM performs the fade/scene change.
            pj_phase_timer = 255;
            script_execute(BANK(pj_menu_script), (UBYTE *)pj_menu_script, NULL, 0);
        }
        else if (INPUT_A_PRESSED) { new_run(); render_objects(); hud(); }
        return;
    }
    if (pj_phase == PJ_CLEAR) {
        if (--pj_phase_timer == 0) { generate_course(); render_objects(); hud(); }
        return;
    }
    if (INPUT_START_PRESSED) { pj_pause_music(TRUE); pj_phase = PJ_PAUSE; hud(); return; }
    ++pj_run_ticks;
    update_blizzard();
    update_bears();
    update_snow();
    update_hammer();
    update_icicle();
    update_meteor();
    if (pj_star) {
        if (--pj_star == 0) pj_set_song(FALSE);
        if ((pj_star + 59) / 60 != pj_last_seconds) pj_hud_dirty = 1;
    }
    if (pj_star && (pj_star & 4)) SET_FLAG(PLAYER.flags, ACTOR_FLAG_HIDDEN);
    else CLR_FLAG(PLAYER.flags, ACTOR_FLAG_HIDDEN);
    if (pj_falling) {
        // Once falling, A cannot provide a jump in mid-air or cancel the miss.
        pj_jump_buffer = 0;
        penguin_velocity_y += 10;
        PLAYER.pos.y += penguin_velocity_y;
        // Disappear below the floor before the sprite can cover the HUD.
        if (PLAYER.pos.y > PX_TO_SUBPX(120)) SET_FLAG(PLAYER.flags, ACTOR_FLAG_HIDDEN);
        if (PLAYER.pos.y >= PX_TO_SUBPX(152)) { pj_death_cause = 3; game_over(); return; }
        render_objects();
        refresh_hud();
        return;
    }
    previous_foot = PLAYER.pos.y + PX_TO_SUBPX(6);
    // Each stage needs a fresh press. Holding A never spends the second jump.
    if (INPUT_A_PRESSED && pj_jumps < 2) {
        ++pj_jumps;
        penguin_velocity_y = pj_jumps == 1 ? -144 : -136;
        pj_jump_buffer = 0; pj_hud_dirty = 1;
        tone(pj_jumps == 1 ? 0xC0 : 0xE0, pj_jumps == 1 ? 0x06 : 0x07);
    }
    // Advance jump physics with distance, keeping the arc fair as scroll speeds up.
    pj_motion_accum += pj_speed;
    while (pj_motion_accum >= PJ_BASE_SPEED) {
        pj_motion_accum -= PJ_BASE_SPEED;
        if (PLAYER.pos.y < PJ_GROUND || penguin_velocity_y < 0) {
            penguin_velocity_y += (INPUT_A && penguin_velocity_y < 0) ? 7 : 10;
            PLAYER.pos.y += penguin_velocity_y;
            if (PLAYER.pos.y >= PJ_GROUND) {
                PLAYER.pos.y = PJ_GROUND; penguin_velocity_y = 0;
                pj_jumps = 0; pj_hud_dirty = 1;
            }
        }
    }
    PLAYER.pos.x += pj_speed;
    airborne = PLAYER.pos.y < PJ_GROUND;
    if (airborne != pj_was_airborne) { actor_set_dir(&PLAYER, DIR_RIGHT, !airborne); pj_was_airborne = airborne; }
    player_moving = !airborne;
    px = SUBPX_TO_PX(PLAYER.pos.x); py = SUBPX_TO_PX(PLAYER.pos.y);
    if (!pj_star && PLAYER.pos.y == PJ_GROUND) {
        for (i = 0; i != PJ_ICE_COUNT; ++i) {
            // Feet are judged at the centre, excluding each two-pixel ice lip.
            if (pj_hole_w[i] && px + 8 >= pj_ice_x[i] + 2 && px + 8 < pj_ice_x[i] + pj_hole_w[i] - 2) {
                pj_falling = 1; pj_jumps = 2; pj_hud_dirty = 1;
                pj_jump_buffer = 0; penguin_velocity_y = 16;
                actor_set_anim_idle(&PLAYER); player_moving = FALSE;
                tone(0x60, 0x04); render_objects(); return;
            }
        }
    }
    while (pj_fish_head < PJ_FISH_COUNT && pj_fish_x[pj_fish_head] + 20 < px) ++pj_fish_head;
    for (i = pj_fish_head; i < PJ_FISH_COUNT; ++i) {
        dx = (INT16)pj_fish_x[i] - (INT16)px;
        if (dx > 20) break;
        dy = (INT16)pj_fish_y[i] - (INT16)py;
        if (!pj_taken[i] && dx >= -8 && dx <= 16 && dy >= -14 && dy <= 14) {
            pj_taken[i] = 1;
            if (pj_fish != 65535) ++pj_fish;
            if (++pj_progress == 100) { pj_progress = 0; pj_star = PJ_STAR_FRAMES; pj_set_song(TRUE); tone(0xC0, 0x07); }
            else tone(0x40, 0x07);
            pj_hud_dirty = 1;
        }
    }
    for (i = 0; i != PJ_ICE_COUNT; ++i) {
        if (!pj_star && pj_ice_h[i] == PJ_FLOAT && px + 12 >= pj_ice_x[i] && px + 3 < pj_ice_x[i] + 16 && py + 6 >= PJ_FLOAT_TOP && py - 8 < PJ_FLOAT_BOTTOM) {
            pj_death_cause = 5; game_over(); return;
        }
        if (!pj_star && pj_ice_h[i] < PJ_METEOR && !pj_hole_w[i] && px + 12 >= pj_ice_x[i] && px + 3 < pj_ice_x[i] + 16 && py + 6 >= 120 - pj_ice_h[i]) {
            pj_death_cause = 1; game_over(); return;
        }
    }
    for (i = 0; i != pj_icicle_volley; ++i) {
        if (pj_icicle_state[i] < 2 || pj_icicle_state[i] > 3) continue;
        bx = SUBPX_TO_PX(pj_icicle_y[i]);
        dx = pj_ice_x[pj_icicle_index[pj_icicle_next]] + (pj_icicle_volley == 3 ? (INT16)i * 16 - 16 : 0);
        if (px + 12 >= dx + 3 && px + 3 < dx + 13 && py + 6 >= bx - 22 && py - 8 < bx + 6) {
            if (pj_star) { pj_icicle_state[i] = 4; pj_icicle_timer[i] = 10; tone(0xA0, 0x06); }
            else { pj_death_cause = 6; game_over(); return; }
        }
    }
    if (pj_hammer_active) {
        bx = SUBPX_TO_PX(pj_hammer_x);
        if (px + 12 >= bx + 2 && px + 3 < bx + 14 && py + 6 >= SUBPX_TO_PX(pj_hammer_y) - 6 && py - 8 < SUBPX_TO_PX(pj_hammer_y) + 6) {
            if (pj_star) pj_hammer_active = 0;
            else { pj_death_cause = 7; game_over(); return; }
        }
    }
    for (i = 0; i != pj_meteor_volley; ++i) {
        if (pj_meteor_state[i] != 2) continue;
        bx = SUBPX_TO_PX(pj_meteor_x[i]);
        // The bright round core is solid; the flame trail is decorative.
        if (px + 12 >= bx + 2 && px + 3 < bx + 14 && py + 6 >= SUBPX_TO_PX(pj_meteor_y[i]) - 7 && py - 8 < SUBPX_TO_PX(pj_meteor_y[i]) + 6) {
            if (pj_star) { pj_meteor_state[i] = 3; tone(0xA0, 0x06); }
            else { pj_death_cause = 8; game_over(); return; }
        }
    }
    for (i = 0; i != PJ_BEAR_COUNT; ++i) {
        if (!pj_snow_active[i]) continue;
        bx = SUBPX_TO_PX(pj_snow_x[i]);
        if (px + 12 >= bx + 1 && px + 3 < bx + 7 && py + 6 >= PJ_SNOW_Y - 3 && py - 8 < PJ_SNOW_Y + 4) {
            if (pj_star) pj_snow_active[i] = 0;
            else { pj_death_cause = 4; game_over(); return; }
        }
    }
    for (i = 0; i != PJ_BEAR_COUNT; ++i) {
        if (!pj_bear_alive[i]) continue;
        bx = SUBPX_TO_PX(pj_bear_x[i]);
        if (px + 12 < bx + 2 || px + 3 >= bx + 22 || py + 6 < 100) continue;
        if (pj_star) {
            pj_bear_alive[i] = 0; pj_bear_squash[i] = 18; tone(0xA0, 0x06);
        } else if (penguin_velocity_y > 0 && previous_foot <= PX_TO_SUBPX(100)) {
            // Cross the top from above while descending; side contact never stomps.
            pj_bear_alive[i] = 0; pj_bear_squash[i] = 18;
            PLAYER.pos.y = PX_TO_SUBPX(94); penguin_velocity_y = -104;
            pj_jumps = 1; pj_hud_dirty = 1;
            if (pj_stomps != 65535) ++pj_stomps;
            tone(0xF0, 0x06);
        } else { pj_death_cause = 2; game_over(); return; }
        pj_bear_windup[i] = pj_bear_throw_pose[i] = 0;
    }
    if (PLAYER.pos.x >= PJ_FINISH) {
        if (pj_courses != 9999) ++pj_courses;
        pj_phase = PJ_CLEAR; pj_phase_timer = 72;
        actor_set_anim_idle(&PLAYER); player_moving = FALSE;
        CLR_FLAG(PLAYER.flags, ACTOR_FLAG_HIDDEN);
        tone(0x60, 0x07); hud(); return;
    }
    render_objects();
    refresh_hud();
}
