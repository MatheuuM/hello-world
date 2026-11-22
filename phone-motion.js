export const PHONE_TURN_END = .095;
export const PHONE_MOTION_END = .29;

const clamp = value => Math.max(0, Math.min(1, value));

export function readPhoneProgress(experience, stage) {
  const travel = experience.offsetHeight - stage.clientHeight;
  return travel > 0 ? clamp(-experience.getBoundingClientRect().top / travel) : 0;
}

export function phonePoseAt(progress) {
  const turn = clamp(progress / PHONE_TURN_END);
  const amount = 1 - (1 - turn) ** 2;
  return {
    pitch: 9 - 8 * amount,
    yaw: -34 + 31 * amount,
    roll: -7 + 6 * amount,
  };
}
