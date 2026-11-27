# Turkey Trot: Thanksgiving Escape

A one-screen turkey escape runner: you are the turkey, the farmer is chasing you, and
the farm kitchen wants you in the oven. Sprint, jump, dash and hide in hay to reach the
wild before you become dinner.

![bounty](https://make.fun/badge/turkey-run-game-01.svg)
[![rank](https://make.fun/badge/turkey-run-game-01/fadliferdian28/turkey-run-game-01/rank.svg)](https://make.fun/bounty/turkey-run-game-01/leaderboard)
![reward](https://make.fun/badge/turkey-run-game-01/fadliferdian28/turkey-run-game-01/reward.svg)

**Bounty:** [make.fun/bounty/turkey-run-game-01](https://make.fun/bounty/turkey-run-game-01) · ref `effxtzzc`

## Play

Plain static files, no build step and no network requests:

```sh
cd game && python3 -m http.server 8080
# open http://localhost:8080
```

Or just open `game/index.html` in desktop Chrome.

| Key | Action |
| --- | --- |
| `←` `→` / `A` `D` | Move |
| `Space` | Jump (mid-air dash) |
| `Shift` | Ground dash |
| `H` | Hide at hay |
| `P` | Pause |
| `R` | Restart |
| `M` | Sound on/off |

Score comes from distance, corn and combo. Three lives, four stages (farmyard, barn,
kitchen, the wild), an oven that flares, carving knives, and a farmer who lunges when
he spots you. Reach the wild to escape; get caught and it is dinner time.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and writes
`dossier.json` with `buildDossier` from `vendor/makefun-game.ts`.

## Layout

- `game/index.html`, `game/src/*.js` — the game (canvas 2D, vanilla ES modules)
- `screenshots/` — real renders of the game, first by name is the cover
- `vendor/makefun-game.ts` — kit copy, unchanged
- `main.ts` — the hand-in program

## License

MIT — see `LICENSE`.
