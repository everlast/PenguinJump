.module pj_menu_script
.include "vm.i"

.globl _scene_start, ___bank_scene_start
.area _CODE_255

___bank_pj_menu_script = 255
.globl ___bank_pj_menu_script

; Use the engine scene-change path so actors, window and scripts are reset.
_pj_menu_script::
        VM_LOCK
        VM_FADE_OUT 1
        VM_RAISE EXCEPTION_CHANGE_SCENE, 3
        .db ___bank_scene_start
        .dw _scene_start
        VM_STOP
