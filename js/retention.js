import { Trophies, retentionSave } from './achievements.js';
import { Lightning } from './challenges.js';
import { Crystal } from './crystal.js';

import { Streak } from './streak.js';
import { Horizon } from './horizon.js';

export { retentionSave };

export class Retention {
  constructor(state, game) {
    this.game = game;
    this.state = state;
    this.horizon = new Horizon(game.horizon);
    this.horizon.use(state.taps);
    const { audio, vibrate, burst, grant, save } = game;
    this.trophies = new Trophies(state.retention, rarity => {
      audio.celebrate(rarity);
      vibrate([10 + rarity * 4, 35, 12 + rarity * 6]);
    }, (xp, charge) => {
      const confetti = document.querySelector('#claim-confetti');
      confetti.getAnimations().forEach(animation => animation.cancel());
      confetti.animate([{ opacity: 1, transform: 'scale(.25)' }, { opacity: 1, offset: .2 }, { opacity: 0, transform: 'scale(2.8)' }], { duration: game.reduced() ? 150 : 650 });
      burst('RESGATADO!', 74);
      audio.celebrate(3);
      vibrate([15, 30, 25]);
      this.streak.trophies(this.trophies.claimedCount(), 24);
      game.fragments('trophy', Math.max(1, Math.round(xp / 2)));
      grant(xp, charge, performance.now());
      save();
    }, () => {
      this.crystal.add('milestone');
      save();
    });
    this.lightning = new Lightning(now => {
      this.state.retention.challenges++;
      this.sync();
      burst('RELÂMPAGO!', 96);
      audio.celebrate(3);
      vibrate([18, 28, 18, 28, 32]);
      const tuning = game.tuning();
      game.fragments('lightning');
      grant(Math.round(65 * tuning.crystalXP), 50 + tuning.crystalCharge, now);
      save();
    }, () => audio.tick());
    this.crystal = new Crystal(state.retention, cracks => {
      audio.crack(cracks);
      vibrate([8 + cracks * 5, 24, 5 + cracks * 4]);
      const animation = () => burst(cracks < 3 ? cracks + '/3' : 'CRISTAL!', cracks < 3 ? 8 * cracks : 90, null, point);
      const point = game.point(document.querySelector('#crystal'));
      if (cracks === 3) game.hit(performance.now(), animation);
      else animation();
    }, (kind, now) => {
      if (kind === 'daily') this.streak.ignite(now);
      this.state.retention.crystals++;
      if (kind === 'bonus' || kind === 'milestone') game.cosmetic();
      this.sync();
      audio.celebrate(2);
      const tuning = game.tuning();
      const xp = kind === 'daily' ? 10 : kind === 'level' ? 18 : 48;
      const charge = kind === 'daily' ? 35 : 10;
      game.fragments('crystal');
      grant(Math.round(xp * tuning.crystalXP), charge + tuning.crystalCharge, now);
      save();
    });
    this.streak = new Streak(state.retention.streak, (days, now) => {
      this.trophies.update({ streak7: days });
      grant(0, 25, now);
      game.notice('🔥 OFENSIVA · ' + days + (days === 1 ? ' DIA!' : ' DIAS!'));
      burst('', 42, document.querySelector('#streak'));
      audio.celebrate(3);
      vibrate([16, 35, 24]);
      save();
    }, days => game.notice('🛡️ Escudo usado! Ofensiva de ' + days + (days === 1 ? ' dia preservada' : ' dias preservada')));
    this.resetSession();
    this.day();
    this.sync(false);
  }

  resetSession() {
    this.criticalTimes = new Float64Array(3);
    this.tapTimes = new Float64Array(20);
    this.keyTimes = new Float64Array(16);
    this.switchTimes = new Float64Array(12);
    this.switchTimes.fill(-Infinity);
    this.switchCursor = 0;
    this.criticalTimes.fill(-Infinity);
    this.tapTimes.fill(-Infinity);
    this.keyTimes.fill(-Infinity);
    this.criticalCursor = this.tapCursor = 0;
    this.last = -Infinity;
    this.flowStart = 0;
  }

  reset(state) {
    this.state = state;
    this.resetSession();
    this.lightning.reset();
    this.trophies.reset(state.retention);
    this.crystal.use(state.retention);
    this.horizon.use(state.taps);
    this.streak.use(state.retention.streak);
    this.day();
    this.sync(false);
  }

  sync(announce = true) {
    const { taps, best, retention } = this.state;
    this.trophies.update({
      first: taps, rhythm: best, taps100: taps, taps10000: taps,
      crystal1: retention.crystals, crystal15: retention.crystals,
      flash1: retention.challenges, flash15: retention.challenges,
      streak7: retention.streak.record,
    }, announce);
    this.horizon.update(taps, this.trophies.unlockedCount() >= 3);
  }

  tap(mode, combo, critical, muted, fingers, key, slide, now) {
    const { retention } = this.state;
    const modes = retention.tapsByMode;
    modes[mode]++;
    const gap = now - this.last;
    if (gap > 1000) this.flowStart = now;
    this.last = now;
    if (gap <= 1000) this.lightning.frame(now, gap, true, mode);
    this.tapTimes[this.tapCursor++ % this.tapTimes.length] = now;
    let hunter = 0;
    if (critical) {
      this.criticalTimes[this.criticalCursor++ % 3] = now;
      for (const time of this.criticalTimes) if (now - time < 10000) hunter++;
    }
    let speed = 0;
    let grid = 0;
    if (mode === 'keys' && key >= 0) {
      this.keyTimes[key] = now;
      for (const time of this.keyTimes) if (now - time <= 4000) grid++;
      this.switchTimes[this.switchCursor++ % this.switchTimes.length] = now;
      for (const time of this.switchTimes) if (now - time <= 1000) speed++;
    }
    this.sync();
    this.trophies.update({
      modes: Number(modes.pulse > 0) + Number(modes.bubbles > 0) + Number(modes.keys > 0),
      pulse50: mode === 'pulse' ? combo : 0, pulse100: mode === 'pulse' ? combo : 0,
      critical: Number(critical), slide, grid, speed,
      silk: this.state.retention.progress.silk + Number(muted),
      electric: Number(fingers >= 3 || now - this.tapTimes[this.tapCursor % 20] <= 1000),
      flow: (now - this.flowStart) / 1000, hunter,
    });
    this.horizon.update(this.state.taps, this.trophies.unlockedCount() >= 3);
    this.streak.tap(now);
    this.lightning.event(mode, 'tap', 1, now);
    this.lightning.event(mode, 'combo', combo, now);
    if (key >= 0) this.lightning.event(mode, 'grid', key, now);
  }

  fever(mode, now) {
    if (mode === 'pulse') this.trophies.update({ fever: 1 });
    this.lightning.event(mode, 'fever', 1, now);
  }

  chain(size, now) {
    this.trophies.update({ chain: size });
    this.lightning.event('bubbles', 'chain', size, now);
    if (size >= 5) this.game.save();
  }

  day() {
    if (this.streak.enter()) {
      this.crystal.daily();
      this.game.save();
    }
  }

  frame(now) {
    if (now >= (this.nextDayCheck ?? 0)) {
      this.nextDayCheck = now + 1000;
      this.day();
    }
    this.lightning.frame(now, 0, false);
  }
}
