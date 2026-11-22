// Reanimated needs native modules. Components only use a small API surface, so tests use a light mock.
jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');
  const easing = (f) => f;
  return {
    __esModule: true,
    default: { createAnimatedComponent: (c) => c, View: RN.View, Text: RN.Text },
    useSharedValue: (v) => ({ value: v }),
    useAnimatedProps: (fn) => fn(),
    useReducedMotion: () => false,
    withTiming: (v) => v,
    withSpring: (v) => v,
    withRepeat: (v) => v,
    Easing: { out: easing, cubic: (x) => x, quad: (x) => x },
  };
});
