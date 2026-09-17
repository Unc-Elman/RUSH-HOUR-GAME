/** Web fallback when Capacitor runtime is not present */
export const Capacitor = {
  isNativePlatform: () => false,
  getPlatform: () => 'web',
};
