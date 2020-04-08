import yargs from 'yargs';

const IGNORED_QUERY_KEYS = ['_', '$0'];

export default class Context {
  constructor(argv, output) {
    this.argv = yargs(argv).argv;
    this.output = output;
  }

  get path() {
    return '/' + this.argv._.join('/');
  }

  get query() {
    return Object.keys(this.argv).reduce((query, key) => {
      if (IGNORED_QUERY_KEYS.includes(key)) {
        return query;
      }

      query[key] = this.argv[key];

      return query;
    }, {});
  }

  get cwd() {
    return process.cwd();
  }

  write(data) {
    this.output.write(data);
  }

  end(data) {
    this.write(data);
    process.exit(1);
  }
}
