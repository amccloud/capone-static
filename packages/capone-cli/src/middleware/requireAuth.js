import invariant from 'invariant';
import netrc from 'netrc';
import readMultiple from 'read-multiple';

const NETRC_KEY = 'caponeapp.com'

export default function requireAuth() {
  async function checkAuth() {
    const store = netrc();
    const auth = store[NETRC_KEY] || {};

    if (!authPresent(auth)) {
      const credentials = await promptCredentials();
      const user = await this.api('/users', {
        method: 'post',
        body: JSON.stringify({user: credentials})
      });

      store[NETRC_KEY] = {
        login: user.email,
        password: user.apiKey
      };

      netrc.save(store);

      return checkAuth();
    }

    return auth;
  }

  function authPresent({login, password}) {
    return login && password;
  }

  function promptCredentials() {
    return new Promise((resolve, reject) => {
      readMultiple([{
        prompt: 'Email:',
      }, {
        prompt: 'Password:',
        silent: true
      }], (error, login, password) => {
        if (error) { return reject(error); }
        resolve({
          email: login.value,
          password: password.value
        });
      });
    });
  }

  return async function requireAuth(context, next) {
    try {
      const auth = await checkAuth.call(context);
      const {api} = context;

      context.api = (resource, options) => {
        return api(resource, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': auth.password
          }
        });
      }
    } catch (error) {
      throw error;
      return context.end();
    }

    await next(context);
  };
}
