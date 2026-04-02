declare module 'socks5-http-client/lib/Agent.js' {
  import { Agent } from 'http';

  interface SOCKS5AgentOptions {
    socksHost?: string;
    socksPort?: number;
    socksUsername?: string;
    socksPassword?: string;
  }

  export default class SOCKS5Agent extends Agent {
    constructor(options?: SOCKS5AgentOptions);
  }
}
