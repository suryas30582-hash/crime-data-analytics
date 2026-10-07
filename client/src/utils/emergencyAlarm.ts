/**
 * Emergency Alarm Sound & Autoplay Management Service
 *
 * Uses BroadcastChannel to coordinate the alarm state across all open police
 * tabs/windows for the same origin. When any tab starts or stops the alarm,
 * every other tab gets the message immediately and mirrors the state.
 *
 * Audio is played ONLY in the "leader" tab (the first one to call startAlarm).
 * All other tabs set isPlaying=true for UI but do NOT play audio.
 * stopAlarm() from ANY tab broadcasts to ALL tabs and stops everything.
 */

type AlarmMessage =
  | { type: 'ALARM_START'; reportCode: string; leaderId: string }
  | { type: 'ALARM_STOP'; leaderId: string }
  | { type: 'LEADER_PING'; leaderId: string }
  | { type: 'LEADER_QUERY' };

const CHANNEL_NAME = 'crimeLytixs_emergency_alarm';
const TAB_ID = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

class EmergencyAlarmService {
  private audioCtx: AudioContext | null = null;
  private sirenInterval: any = null;
  private isPlaying: boolean = false;
  private isLeader: boolean = false;
  private currentLeaderId: string | null = null;
  private isAutoplayBlocked: boolean = false;
  private currentGain: GainNode | null = null;
  private currentOscillator: OscillatorNode | null = null;
  private listenersAttached: boolean = false;
  private channel: BroadcastChannel | null = null;
  private onStateChangeCallbacks: Set<() => void> = new Set();

  constructor() {
    this.setupBroadcastChannel();
    this.setupGlobalUnlockListeners();
  }

  // ─── BroadcastChannel ────────────────────────────────────────────────────

  private setupBroadcastChannel() {
    if (typeof window === 'undefined') return;
    try {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (e: MessageEvent<AlarmMessage>) =>
        this.handleChannelMessage(e.data);
      this.postMessage({ type: 'LEADER_QUERY' });
      window.addEventListener('beforeunload', () => {
        if (this.isLeader && this.isPlaying) {
          this.postMessage({ type: 'ALARM_STOP', leaderId: TAB_ID });
        }
        this.channel?.close();
      });
    } catch {
      this.channel = null;
    }
  }

  private postMessage(msg: AlarmMessage) {
    try { this.channel?.postMessage(msg); } catch { /* closed */ }
  }

  private handleChannelMessage(msg: AlarmMessage) {
    switch (msg.type) {
      case 'ALARM_START': {
        this.currentLeaderId = msg.leaderId;
        this.isLeader = (msg.leaderId === TAB_ID);
        if (!this.isPlaying) {
          this.isPlaying = true;
          if (!this.isLeader) this.stopAudioOnly();
          this.notify();
        }
        break;
      }
      case 'ALARM_STOP': {
        this.currentLeaderId = null;
        this.isLeader = false;
        if (this.isPlaying) {
          this.isPlaying = false;
          this.stopAudioOnly();
          this.notify();
        }
        break;
      }
      case 'LEADER_PING': {
        if (!this.isPlaying) {
          this.currentLeaderId = msg.leaderId;
          this.isLeader = (msg.leaderId === TAB_ID);
          this.isPlaying = true;
          this.notify();
        }
        break;
      }
      case 'LEADER_QUERY': {
        if (this.isLeader && this.isPlaying) {
          this.postMessage({ type: 'LEADER_PING', leaderId: TAB_ID });
        }
        break;
      }
    }
  }

  // ─── Subscriber pattern ───────────────────────────────────────────────────

  public subscribe(cb: () => void): () => void {
    this.onStateChangeCallbacks.add(cb);
    return () => this.onStateChangeCallbacks.delete(cb);
  }

  private notify() {
    this.onStateChangeCallbacks.forEach(cb => {
      try { cb(); } catch (e) { console.error('Alarm subscriber error:', e); }
    });
  }

  // ─── AudioContext ─────────────────────────────────────────────────────────

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (Ctx) this.audioCtx = new Ctx();
    }
    return this.audioCtx;
  }

  private setupGlobalUnlockListeners() {
    if (typeof window === 'undefined' || this.listenersAttached) return;
    this.listenersAttached = true;
    const unlock = () => {
      const ctx = this.getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().then(() => {
          this.isAutoplayBlocked = false;
          this.notify();
          if (this.isPlaying && this.isLeader && !this.sirenInterval) {
            this.startPulseLoop();
          }
        }).catch(err => console.warn('AudioContext resume error:', err));
      } else {
        this.isAutoplayBlocked = false;
        this.notify();
      }
    };
    ['click', 'keydown', 'touchstart'].forEach(ev =>
      window.addEventListener(ev, unlock, { passive: true })
    );
  }

  // ─── Audio playback ───────────────────────────────────────────────────────

  public playSinglePulse() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
      if (ctx.state === 'suspended') {
        this.isAutoplayBlocked = true;
        this.notify();
        return;
      }
    }
    try {
      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.4, now);
      masterGain.connect(ctx.destination);
      this.currentGain = masterGain;

      const osc1 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(920, now);
      osc1.frequency.exponentialRampToValueAtTime(860, now + 0.35);
      osc1.connect(masterGain);
      osc1.start(now);
      osc1.stop(now + 0.35);

      const osc2 = ctx.createOscillator();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(740, now + 0.38);
      osc2.frequency.exponentialRampToValueAtTime(680, now + 0.75);
      osc2.connect(masterGain);
      osc2.start(now + 0.38);
      osc2.stop(now + 0.75);
      this.currentOscillator = osc2;

      masterGain.gain.setValueAtTime(0.4, now + 0.65);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.78);
    } catch (err) {
      console.warn('Alarm pulse error:', err);
    }
  }

  private startPulseLoop() {
    if (this.sirenInterval) clearInterval(this.sirenInterval);
    this.playSinglePulse();
    this.sirenInterval = setInterval(() => {
      if (this.isPlaying && this.isLeader) this.playSinglePulse();
    }, 1150);
  }

  private stopAudioOnly() {
    if (this.sirenInterval) {
      clearInterval(this.sirenInterval);
      this.sirenInterval = null;
    }
    if (this.currentGain) {
      try {
        const ctx = this.getAudioContext();
        if (ctx) {
          this.currentGain.gain.cancelScheduledValues(ctx.currentTime);
          this.currentGain.gain.setValueAtTime(0.0001, ctx.currentTime);
        }
      } catch {}
      this.currentGain = null;
    }
    if (this.currentOscillator) {
      try { this.currentOscillator.stop(); } catch {}
      this.currentOscillator = null;
    }
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * Start the alarm.
   * Idempotent: no-op if already playing (as leader OR follower).
   * Broadcasts ALARM_START to all other same-origin tabs.
   */
  public startAlarm(reportCode = 'unknown') {
    if (this.isPlaying && this.isLeader && this.sirenInterval) return;
    if (this.isPlaying && !this.isLeader) return;

    this.isLeader = true;
    this.currentLeaderId = TAB_ID;
    this.isPlaying = true;
    this.notify();

    this.postMessage({ type: 'ALARM_START', reportCode, leaderId: TAB_ID });

    const ctx = this.getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().then(() => {
        this.isAutoplayBlocked = false;
        this.notify();
        if (!this.sirenInterval) this.startPulseLoop();
      }).catch(() => {
        this.isAutoplayBlocked = true;
        this.notify();
      });
    } else {
      this.isAutoplayBlocked = false;
      if (!this.sirenInterval) this.startPulseLoop();
    }
  }

  /**
   * Stop the alarm. Broadcasts to ALL tabs immediately.
   */
  public stopAlarm() {
    this.isPlaying = false;
    this.isLeader = false;
    this.currentLeaderId = null;
    this.isAutoplayBlocked = false;
    this.stopAudioOnly();
    this.notify();
    this.postMessage({ type: 'ALARM_STOP', leaderId: TAB_ID });
  }

  public getIsPlaying(): boolean { return this.isPlaying; }
  public getIsAutoplayBlocked(): boolean { return this.isAutoplayBlocked; }
}

export const emergencyAlarm = new EmergencyAlarmService();