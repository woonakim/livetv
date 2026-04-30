// Web Audio API로 생성하는 알림음 프리셋
export type AlarmSoundKey = "beep" | "bell" | "chime" | "ping" | "alert" | "drop";

export const ALARM_SOUND_LABELS: Record<AlarmSoundKey, string> = {
  beep: "삐빅 (2음)",
  bell: "벨 (종소리)",
  chime: "차임 (도미솔)",
  ping: "핑 (짧게)",
  alert: "알람 (경고음)",
  drop: "드롭 (고→저)",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeCtx(): AudioContext | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    return new Ctx();
  } catch { return null; }
}

function tone(ctx: AudioContext, freq: number, startAt: number, duration: number, volume = 0.15, type: OscillatorType = "sine") {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = freq;
  osc.type = type;
  gain.gain.setValueAtTime(0, ctx.currentTime + startAt);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + startAt + 0.01);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + startAt + duration);
  osc.start(ctx.currentTime + startAt);
  osc.stop(ctx.currentTime + startAt + duration);
}

export function playAlarm(key: AlarmSoundKey = "beep") {
  const ctx = makeCtx();
  if (!ctx) return;

  switch (key) {
    case "beep":
      tone(ctx, 880, 0, 0.15);
      tone(ctx, 1100, 0.2, 0.2);
      break;
    case "bell":
      // 종소리: 저 주파수 + 하모닉
      tone(ctx, 523, 0, 0.6, 0.12);
      tone(ctx, 1047, 0, 0.5, 0.08);
      tone(ctx, 1568, 0, 0.4, 0.04);
      break;
    case "chime":
      // 도-미-솔
      tone(ctx, 523.25, 0, 0.25);
      tone(ctx, 659.25, 0.25, 0.25);
      tone(ctx, 783.99, 0.5, 0.35);
      break;
    case "ping":
      // 짧은 고음
      tone(ctx, 1800, 0, 0.1, 0.18);
      break;
    case "alert":
      // 경고음: 사이렌 느낌
      tone(ctx, 700, 0, 0.15, 0.18, "square");
      tone(ctx, 500, 0.17, 0.15, 0.18, "square");
      tone(ctx, 700, 0.34, 0.15, 0.18, "square");
      break;
    case "drop":
      // 고→저 하강
      tone(ctx, 1200, 0, 0.3, 0.15);
      tone(ctx, 600, 0.15, 0.25, 0.12);
      break;
  }
}
