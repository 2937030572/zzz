/**
 * 按环境区分的 Babel 配置（替代原 .babelrc）。
 *
 * 原配置把 preset-react 的 development 硬编码为 true，
 * 导致生产构建也编译出 jsxDEV（dev 运行时），`next build` 预渲染
 * /_not-found 时崩溃：(0 , d.jsxDEV) is not a function。
 *
 * 现在：开发环境启用 jsxDEV + react-dev-inspector 插件；
 * 生产环境使用标准 JSX 运行时，不加载 dev 插件。
 */
module.exports = function (api) {
  const isDev = api.env('development');

  return {
    presets: [
      [
        'next/babel',
        {
          'preset-react': {
            development: isDev,
          },
        },
      ],
    ],
    plugins: isDev ? ['@react-dev-inspector/babel-plugin'] : [],
  };
};
