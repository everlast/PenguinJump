#pragma bank 255
#include "states/logo.h"
#include "states/penguin_title.h"
#include "states/penguin_mode.h"
#include "camera.h"
#include "game_time.h"
#include "input.h"
#include <string.h>

UBYTE pj_game_mode;
static UBYTE pj_title_tick, pj_title_frame, pj_title_ready;

void logo_init(void) BANKED {
    camera_offset_x = camera_offset_y = 0;
    game_time = 0;
    pj_title_tick = pj_title_frame = pj_title_ready = 0;
}

void logo_update(void) BANKED {
    UBYTE i, tiles[100], previous_mode = pj_game_mode;
    if (!pj_title_ready) {
        VBK_REG = 1;
        set_bkg_data(144, PJ_MENU_TILE_COUNT, pj_menu_tiles);
        memset(tiles, 0x08, sizeof(tiles));
        set_bkg_tiles(0, 13, 20, 5, tiles);
        set_bkg_tiles(8, 9, 4, 4, tiles);
        for (i = 0; i != 16; ++i) tiles[i] = 128 + i;
        VBK_REG = 0;
        set_bkg_tiles(8, 9, 4, 4, tiles);
        set_bkg_tiles(0, 13, 20, 5, pj_menu_maps[pj_game_mode]);
        pj_title_ready = 1;
    }
    // A / START starts the already selected mode. A held direction never repeats.
    if (!INPUT_A && !INPUT_START) {
        if (INPUT_LEFT_PRESSED) pj_game_mode = PJ_MODE_NORMAL;
        else if (INPUT_RIGHT_PRESSED) pj_game_mode = PJ_MODE_HARD;
        else if (INPUT_SELECT_PRESSED) pj_game_mode ^= 1;
    }
    if (previous_mode != pj_game_mode) {
        VBK_REG = 0;
        set_bkg_tiles(0, 13, 20, 5, pj_menu_maps[pj_game_mode]);
    }
    if (!pj_title_tick) {
        // Title art uses bank 0. Reserve bank 1 tiles 128..143 for animation.
        // These tile numbers address the same bytes in both LCD tile modes.
        VBK_REG = 1;
        set_bkg_data(128, 16, pj_title_frames[pj_title_frame]);
        VBK_REG = 0;
        pj_title_frame = (pj_title_frame + 1) & 7;
    }
    pj_title_tick = (pj_title_tick + 1) & 7;
}
