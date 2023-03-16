import HttpsProxyAgent from 'https-proxy-agent';

export default () => {

    switch(process.env.PROXY_TYPE){
        case "SOCKS5":
            if(process.env.PROXY_SOCKS5_HOST){
                return new Agent({
                socksHost: process.env.PROXY_SOCKS5_HOST,
                socksPort: process.env.PROXY_SOCKS5_PORT,
                socksUsername: process.env.PROXY_SOCKS5_USER,
                socksPassword: process.env.PROXY_SOCKS5_PASS,
                });
            }else{
                return undefined;
            }
        break;
        case "HTTPS":
            if(process.env.PROXY_HTTPS_STRING){
                return new HttpsProxyAgent(process.env.PROXY_HTTPS_STRING);
            }else{
                return undefined;
            }
        break;
        default:
            return undefined;
    }
}


