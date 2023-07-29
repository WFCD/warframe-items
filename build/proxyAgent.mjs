import { HttpsProxyAgent } from 'https-proxy-agent';
import SOCKS5Agent from 'socks5-http-client/lib/Agent.js';

export default () => {
  switch (process.env.PROXY_TYPE) {
    case 'SOCKS5':
      if (process.env.PROXY_SOCKS5_HOST) {
        console.log('SOCKS5 proxy will be used.');
        return new SOCKS5Agent({
          socksHost: process.env.PROXY_SOCKS5_HOST,
          socksPort: process.env.PROXY_SOCKS5_PORT,
          socksUsername: process.env.PROXY_SOCKS5_USER,
          socksPassword: process.env.PROXY_SOCKS5_PASS,
        });
      }
      console.warn('SOCKS5 proxy is selected but no configuration is provided.');
      return undefined;

    case 'HTTPS':
      if (process.env.PROXY_HTTPS_STRING) {
        console.log('HTTPS proxy will be used.');
        return new HttpsProxyAgent(process.env.PROXY_HTTPS_STRING);
      }
      console.warn('HTTPS proxy is selected but no configuration is provided.');
      return undefined;
    default:
      console.log(
        'No proxy will be used. This is most likely fine in development but origin.warframe.com is usually blocked in most servers.'
      );
      return undefined;
  }
};
