module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated 4 moved its Babel plugin into react-native-worklets;
    // `react-native-reanimated/plugin` is now just a re-export of it. It must
    // stay last in the list.
    plugins: ['react-native-worklets/plugin'],
  };
};
