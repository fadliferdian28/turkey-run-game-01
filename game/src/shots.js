// Screenshot staging. `?shot=cover|play|end` builds a deterministic, photogenic
// state on load so the real renderer can be captured without playing by hand.
// These helpers only poke the same state the game loop uses.

import { GROUND_Y, VIEW_W, WORLD_LENGTH, distanceForX, xForDistance } from './world.js';

export function readShotParam(search = window.location.search) {
  const params = new URLSearchParams(search);
  const shot = params.get('shot');
  return shot === 'cover' || shot === 'play' || shot === 'end' ? shot : null;
}

export function applyShot(name, game) {
  if (name === 'cover') return stageCover(game);
  if (name === 'play') return stagePlay(game);
  if (name === 'end') return stageEnd(game);
  return null;
}

function poseTurkey(turkey, x) {
  turkey.x = x;
  turkey.y = GROUND_Y;
  turkey.vy = 0;
  turkey.grounded = true;
  turkey.invuln = 999;
  turkey.dashCooldown = 0;
  turkey.hideCooldown = 0;
  turkey.hitStun = 0;
  turkey.runPhase = 2.1;
  turkey.bob = 1.8;
}

function poseFarmer(farmer, x, state = 'chase') {
  farmer.x = x;
  farmer.state = state;
  farmer.stunTimer = 0;
  farmer.alert = 1;
  farmer.lunge = 0.3;
  farmer.phase = 1.4;
  farmer.searchTimer = 0;
}

function stageCover(game) {
  game.mode = 'title';
  game.freeze = true;
  game.clock = 1.35;
  game.cam = 0;
  game.hud.show(false);
  game.showTitle(true);
  poseTurkey(game.turkey, 884);
  poseFarmer(game.farmer, 1082);
  game.farmer.alert = 0.6;
  return { frozen: true };
}

function stagePlay(game) {
  game.resetRun({ quiet: true });
  const x = xForDistance(632);
  poseTurkey(game.turkey, x);
  poseFarmer(game.farmer, x - 206);
  game.farmer.alert = 1.6;

  const oven = game.world.hazards.find((h) => h.type === 'oven' && h.x > x);
  if (oven) game.hazards.flames.set(oven, 0.62);
  const emitter = game.world.hazards.find((h) => h.type === 'knifeEmitter' && h.x > x);
  if (emitter) {
    game.hazards.knives.push({
      x: x + 330,
      y: GROUND_Y - 52,
      vx: -470,
      origin: x + 330,
      spin: 1.2,
      bob: 0,
      high: false,
      dead: false,
    });
  }

  game.stats.score = 8420;
  game.stats.distance = distanceForX(x);
  game.stats.lives = 2;
  game.stats.corn = 37;
  game.stats.combo = 2.6;
  game.stats.elapsed = 74;
  game.combo = 2.6;
  game.cam = Math.max(0, Math.min(WORLD_LENGTH - VIEW_W, x - 360));
  game.stageIndex = 2;
  game.showTitle(false);
  game.showEnd(false);
  game.showPause(false);
  game.hud.reset();
  game.hud.show(true);
  game.hud.update(game.hudState());
  game.hud.banner('SPOTTED — KEEP RUNNING!', 30);
  game.hud.callout('GOBBLE!');
  game.freeze = true;
  game.clock = 2.15;
  return { frozen: true };
}

function stageEnd(game) {
  game.resetRun({ quiet: true });
  game.stats.score = 24680;
  game.stats.distance = 900;
  game.stats.lives = 1;
  game.stats.corn = 58;
  game.stats.combo = 3;
  game.stats.elapsed = 168;
  game.combo = 3;
  game.turkey.x = WORLD_LENGTH;
  game.turkey.y = GROUND_Y;
  game.turkey.invuln = 999;
  game.turkey.grounded = true;
  game.farmer.x = 180;
  game.farmer.alert = 0;
  game.farmer.state = 'search';
  game.state = 'escaped';
  game.mode = 'escape';
  game.hud.show(false);
  game.showTitle(false);
  game.showPause(false);
  game.showEnd(true, 'escaped');
  game.fillEndScreen('escaped');
  game.freeze = true;
  game.clock = 1.7;
  return { frozen: true };
}
