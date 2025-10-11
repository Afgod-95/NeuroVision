module.exports = function (api: any) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // 👇 Reanimated plugin must always be listed LAST
      'react-native-reanimated/plugin',
    ],
  };
};
