import pathToRegexp from 'path-to-regexp';

export default class Router {
  get(path, middleware, options) {
    const expression = pathToRegexp(path, options);

    return async function get(context) {
      const matches = expression.exec(context.path);

      if (matches) {
        const args = matches.slice(1);
        await middleware.apply(null, [context].concat(args));
      }
    };
  }
}
