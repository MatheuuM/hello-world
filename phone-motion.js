/* All seven chapters share the same scroll-owned phone trajectory. */
(() => {
  'use strict';
  const keys = [
    [0, 9, -34, -7], [.166, 1, -3, -1], [.22, -5, 19, 2],
    [.274, 6, 54, -4], [.335, -4, 15, -3], [.384, 2, -23, 2],
    [.432, 7, -49, 5], [.472, -4, -17, -3], [.524, 1, 23, 3],
    [.571, 5, 47, -2], [.615, -5, 10, -5], [.66, -2, -21, -3],
    [.71, 6, -46, 4], [.774, -5, 16, -4], [.828, 1, 31, 3],
    [.878, 4, -20, -3], [.928, 5, -52, -4], [.969, -3, -19, 2],
    [1, 3, 20, -2]
  ];
  const clamp = n => Math.max(0, Math.min(1, n));
  function at(progress, compact) {
    let i = 0;
    while (i < keys.length - 2 && progress > keys[i + 1][0]) i++;
    const a = keys[i], b = keys[i + 1];
    const t = clamp((progress - a[0]) / (b[0] - a[0]));
    const early = compact ? .43 : .38;
    const blend = i === 0
      ? early * (1 - (1 - t) ** (compact ? 27 : 15)) + (1 - early) * t
      : t * t * (3 - 2 * t);
    return {
      pitch: a[1] + (b[1] - a[1]) * blend,
      yaw: a[2] + (b[2] - a[2]) * blend,
      roll: a[3] + (b[3] - a[3]) * blend
    };
  }
  window.MOVVA_PHONE_POSE = { at };
})();
