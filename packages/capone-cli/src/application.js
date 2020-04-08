import compose from 'koa-compose';
import Context from './context';

export default class Application {
  constructor() {
    this.middleware = [];
  }

  use(middleware) {
    this.middleware.push(middleware);
    return this;
  }

  async listen(argv, output, callback) {
    const context = new Context(argv, output);
    const stack = compose(this.middleware);

    try {
      callback(null, await stack(context));
    } catch (error) {
      callback(error, null);
    }
  }
}
