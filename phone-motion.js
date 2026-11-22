export const MOBILE_PHONE_QUERY = '(max-width: 760px), (hover: none) and (pointer: coarse)';
export const PHONE_TURN_END = .166;
export const PHONE_MOTION_END = .29;

const clamp = value => Math.max(0, Math.min(1, value));

export function readPhoneProgress(experience, stage) {
  const travel = experience.offsetHeight - stage.clientHeight;
  return travel > 0 ? clamp(-experience.getBoundingClientRect().top / travel) : 0;
}

export function phoneTurnAt(progress, mobile = false) {
  const turn = clamp(progress / PHONE_TURN_END);
  const earlyWeight = mobile ? .43 : .38;
  const earlyTurn = 1 - (1 - turn) ** (mobile ? 27 : 15);
  const angle = earlyWeight * earlyTurn + (1 - earlyWeight) * turn;
  // Frames are sampled in the model's eased parameter, not at equal angles.
  return 1 - Math.sqrt(1 - angle);
}

export function phonePoseAt(progress) {
  const turn = phoneTurnAt(progress);
  const amount = 1 - (1 - turn) ** 2;
  return {
    pitch: 9 - 8 * amount,
    yaw: -34 + 31 * amount,
    roll: -7 + 6 * amount,
  };
}
