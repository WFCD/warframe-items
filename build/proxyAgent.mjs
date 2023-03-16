import HttpsProxyAgent from 'https-proxy-agent';
import SOCKS5Agent from 'socks5-http-client/lib/Agent.js';

export default () => {
  switch (process.env.PROXY_TYPE) {
    case 'SOCKS5':
      if (process.env.PROXY_SOCKS5_HOST) {
        return new SOCKS5Agent({
          socksHost: process.env.PROXY_SOCKS5_HOST,
          socksPort: process.env.PROXY_SOCKS5_PORT,
          socksUsername: process.env.PROXY_SOCKS5_USER,
          socksPassword: process.env.PROXY_SOCKS5_PASS,
        });
      }
      return undefined;
    case 'HTTPS':
      if (process.env.PROXY_HTTPS_STRING) {
        return new HttpsProxyAgent(process.env.PROXY_HTTPS_STRING);
      }
      return undefined;
    default:
      return undefined;
  }
};
