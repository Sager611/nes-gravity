;; NOTE: don't name your labels w/ too many characters
;; or you'll get a 'branch address out of range' error.
;; use asm6 for compilation
	;.inesprg 1 	; iNES HEADER - 1x 16KB PRG
	;.ineschr 1 	; 1x 8KB CHR
	;.inesmap 0 	; mapper. 0 = NROM, no blank swapping
	;.inesmir 1 	; background mirroring

;;;;;;;;;;;;;;;;;;;;;;;;;

;; VARIABLES
	.enum $0000
zpvar1 		.dsb 1
zpvar2 		.dsb 1

ballxL 		.dsb 1 	; ballx := HIGH(ballx).LOW(ballx) the '.' is the decimal dot.
ballxH 		.dsb 1 	; unsigned
ballyL 		.dsb 1 	; bally := HIGH(bally).LOW(bally)
ballyH 		.dsb 1 	; unsigned
ballvelxL 	.dsb 1 	; signed 2's compl
ballvelxH 	.dsb 1
ballvelyL 	.dsb 1 	; signed 2's compl
ballvelyH 	.dsb 1

buttons1 	.dsb 1 	; bits are, in order: A,B,select,start,up,down,left,right
buttons2 	.dsb 1 	; bits are, in order: A,B,select,start,up,down,left,right
	.ende

	.enum $0010
centerx 	.dsb 1
centery 	.dsb 1

gamestate 	.dsb 1
	.ende

;; CONSTANTS
STATETITLE 	= $00
STATEPLAYING 	= $01
STATEGAMEOVER 	= $02

PALETTESB 	= $20 	; no. of bytes for the palettes (36)
SPRITESB 	= $08 	; no. of bytes for the sprites (8)

PRG_COUNT = 1 ;1 = 16KB, 2 = 32KB
MIRRORING = %0001 ;%0000 = horizontal, %0001 = vertical, %1000 = four-screen

;; MACROS
.macro A2C 	; accumulator 2's complement
    EOR #$FF
    CLC
    ADC #$01
.endm

;----------------------------------------------------------------
; iNES header
;----------------------------------------------------------------

	.db "NES", $1a ;identification of the iNES header
	.db PRG_COUNT ;number of 16KB PRG-ROM pages
	.db $01 ;number of 8KB CHR-ROM pages
	.db $00|MIRRORING ;mapper 0 and mirroring
	.dsb 9, $00 ;clear the remaining bytes

;;;;;;;;;;;;;;;;;;;;;;;;;

	.base $10000-(PRG_COUNT*$4000)

	;.bank 0
	;.org $C000 	; PRG

vblankwait:
	BIT $2002
	BPL vblankwait
	RTS

RESET:
	SEI 		; disable IRQs
	CLD		; disable decimal mode (NES 6502 does not use it)
  	LDX #$40
  	STX $4017    ; disable APU frame IRQ
  	LDX #$FF
  	TXS          ; Set up stack
  	INX          ; now X = 0
  	STX $2000    ; disable NMI
  	STX $2001    ; disable rendering
  	STX $4010    ; disable DMC IRQs

	JSR vblankwait 	; First wait for vblank to make sure PPU is ready

clrmem:
	LDA #$00
	STA $0000, x
	STA $0100, x
	STA $0300, x
	STA $0400, x
	STA $0500, x
	STA $0600, x
	STA $0700, x
	LDA #$FE
	STA $0200, x    ;move all sprites off screen
	INX
	BNE clrmem

	JSR vblankwait 	; Second wait for vblank, PPU is ready after this

LoadBackground:
	LDA $2002 	; reset PPU palette latch
	LDA #$20 	; set the palettes addresses to $2000 -
	STA $2006
	LDA #$00
	STA $2006
	LDX #$00
	LDY #$00
LoadBackgroundLoop:
	LDA #$24 	; 8x8 tile from .chr
	;LDA background, x
	STA $2007
	INX 		; x++
	CPX #$80 	; if(x != ...) goto LoadBackgroundLoop
	BNE LoadBackgroundLoop
	LDX #$00
	INY
	CPY #$10
	BNE LoadBackgroundLoop

;LoadAttribute:
	;LDA $2002 	; reset PPU palette latch
	;LDA #$23 	; set the attributes addresses to $23C0 -
	;STA $2006
	;LDA #$C0
	;STA $2006
	;LDX #$00
;LoadAttributeLoop:
	;LDA #$00 	; set everything to 0
	;;LDA attribute, x
	;STA $2007
	;INX 		; x++
	;CPX #$40 	; if(x != ...) goto LoadAttributeLoop
	;BNE LoadAttributeLoop

LoadPalettes:
	LDA $2002 	; reset PPU palette latch
	LDA #$3F 	; set the palettes addresses to $3F00 - $3F10
	STA $2006
	LDA #$10
	STA $2006

	LDX #$00 	; x=0
LoadPalettesLoop:
	LDA palette, x 	        ; load data from $(palette + x)
	STA $2007 	            ; and write it to the PPU
	INX 		            ; x++
	CPX #PALETTESB 	        ; if(x != PALETTESB)
	BNE LoadPalettesLoop    ;   goto LoadPalettesLoop // bg and sprite palettes

LoadSprites: 		; starting sprites attributes and information
	LDX 0 		; x=0
LoadSpritesLoop:
	LDA sprites, x  ; load from $(sprites + x)
	STA $0200, x 	; store in RAM $(0200 + x)
	INX 		; x++
	CPX #SPRITESB 	; if(x != SPRITESB) goto LoadSpritesLoop
	BNE LoadSpritesLoop


; initial variable values
	LDA #STATEPLAYING 	; starting game state everytime we reset
	STA gamestate

	;; ball initial values
	LDA #$80
	STA ballxH
	LDA #$30
	STA ballyH
	LDA #$00
	STA ballxL
	STA ballyL
	LDA #$70
	STA ballvelxH
	STA ballvelxL
	LDA #$00
	STA ballvelyH
	STA ballvelyL

	;; center initial values
	LDA #$80
	STA centerx
	LDA #$80
	STA centery

	LDA #%10010000	; PPUCTRL. Enable NMI, sprites pattern 0, bg pattern 1
	STA $2000

	LDA #%00011110	; PPUMASK. Enable sprites, enable background
	STA $2001	;

Forever:
	JMP Forever 	; infinite loop. Logic is done through the NMI interrupt




NMI:
	LDA #$00 	; Set RAM location for DMA sprite transfer to $0200 - $02FF
	STA $2003
	LDA #$02
	STA $4014 	; start DMA transfer

	JSR ReadControllers

GameEngine:
	LDA gamestate
	CMP #STATETITLE
	BEQ EngineTitle    ;;game is displaying title screen

	;LDA gamestate
	;CMP #STATEGAMEOVER
	;BEQ EngineGameOver  ;;game is displaying ending screen

	LDA gamestate
	CMP #STATEPLAYING
	BEQ EnginePlaying   ;;game is playing
GameEngineDone:

	JSR UpdateSprites

	RTI 		; return from interrupt


EngineTitle:
	JMP GameEngineDone

EnginePlaying:

	;; ball
	JSR BallApplyGravity

	LDA ballvelxH
	CLC
	BMI BallXNeg 	; if vel < 0 (MSB == 1)
	ADC ballxL
	STA ballxL
	LDA ballxH
	ADC #$00
	STA ballxH ; ballx += ballvelx / 256
	JMP BallXDone
BallXNeg:
	ADC ballxL
	STA ballxL
	BCS BallXDone ; if(ballvelxL > 0)
	LDA ballxH
	SBC #$00	; ballvelxH--
	STA ballxH
BallXDone:

	LDA ballvelyH
	CLC
	BMI BallYNeg 	; if vel < 0 (MSB == 1)
	ADC ballyL
	STA ballyL
	LDA ballyH
	ADC #$00
	STA ballyH ; bally += ballvely / 256
	JMP BallYDone
BallYNeg:
	ADC ballyL
	STA ballyL
	BCS BallYDone ; if(ballvelyL > 0)
	LDA ballyH
	SBC #$00	; ballvelyH--
	STA ballyH
BallYDone:

	;; center
; bits are, in order: A,B,select,start,up,down,right,left
	LDA buttons1
	AND #%00000001
	BNE + 		; bit is 0
	DEC centerx
+:
	LDA buttons1
	AND #%00000010
	BNE + 		; bit is 0
	INC centerx
+:
	LDA buttons1
	AND #%00000100
	BNE + 		; bit is 0
	DEC centery
+:
	LDA buttons1
	AND #%00001000
	BNE + 		; bit is 0
	INC centery
+:

	JMP GameEngineDone

EngineGameOver:
	JMP GameEngineDone


BallApplyGravity:
	;; center - ball
	;; instructions are in this sequence so as to add
	;; the carry C appropiately
	LDA ballxH   ; always > 0
        A2C
	CLC
	ADC centerx ; always > 0
	TAX 	; X = A = LOW(centerx - ballx)
	LDA #$FF
	ADC #$00 ; A = HIGH(centerx - ballx)
	CLC
	TAY 	; Y = A
	TXA 	; A = X
	ADC ballvelxL
	STA ballvelxL
	TYA 	; A = Y
	ADC ballvelxH
	BVS + 		; overflow
	STA ballvelxH
+:

	LDA ballyH   ; always > 0
        A2C
	CLC
	ADC centery ; always > 0
	TAX 	; X = A = LOW(centery - bally)
	LDA #$FF
	ADC #$00 ; A = HIGH(centery - bally)
	CLC
	TAY 	; Y = A
	TXA 	; A = X
	ADC ballvelyL
	STA ballvelyL
	TYA 	; A = Y
	ADC ballvelyH
	BVS + 		; overflow
	STA ballvelyH
+:

	RTS

UpdateSprites:
	LDA ballyH ;;update all ball sprite info
  	STA $0200
  	LDA ballxH
  	STA $0203

	LDA centery
	STA $0204
	LDA centerx
	STA $0207

	RTS


ReadControllers:
	LDA #$01
	STA $4016
	LDA #$00
	STA $4016
	LDX #$08 			; x = 8
ReadController1Loop:
	LDA $4016
	LSR A 				; c = A[LSB]; A = A >> 1
	ROL buttons1 			; buttons1 << 1 concat c
	DEX 				; x--
	BNE ReadController1Loop 	; if(x != 0) goto ReadController1Loop

ReadController2:
	LDA #$01
	STA $4016
	LDA #$00
	STA $4016
	LDX #$08 			; x = 8
ReadController2Loop:
	LDA $4016
	LSR A 				; c = A[LSB]; A = A >> 1
	ROL buttons2 			; buttons2 << 1 concat c
	DEX 				; x--
	BNE ReadController2Loop 	; if(x != 0) goto ReadController1Loop

	RTS

;;;;;;;;;;;;;;;;;;;;;;;;;

  	.org $E000
; you can find a palette reference here: https://nesdev-wiki.nes.science/wikipages/PPU_palettes.xhtml
palette:
    ;   v palette 0
    ;                     v palette 1
  	.db $00,$17,$27,$37,  $00,$2d,$3d,$30,  $22,$1C,$15,$14,  $22,$02,$38,$3C   ;;sprite palette
    ;   v main background colors
  	.db $0d,$29,$1A,$0F,  $22,$36,$17,$0F,  $22,$30,$21,$0F,  $22,$27,$17,$0F   ;;background palette

sprites:
    ;   Reference:
    ;   --------------------
  	;   vert tile attr horiz
    ;   --------------------
    ;   v sprite vertical position
    ;        v sprite no. in CHR
    ;             v palette number
    ;                  v sprite horizontal position
  	.db $80, $00, $01, $80   ; ball
  	.db $10, $01, $00, $D0   ; center
  	.db $80, $02, $00, $80
  	.db $80, $02, $00, $80
  	.db $80, $02, $00, $80
  	.db $80, $02, $00, $80

	.org $FFFA  	; Interrupt table. at the end of bank 1
	.dw NMI 	; Vector interrupt once each frame. dw=data word
	.dw RESET
	.dw 0 		; external vector interrupt IRQ (mapper chips and audio interrupts; not used)

;;;;;;;;;;;;;;;;;;;;;;;;;

	.incbin "gravity.chr" 	; include binary with sprites (8KB)

