const DISABLED = true;
const request = require('request-promise');
const { stocktwits: config, proxy: proxyConfig } = require('../config');

const getProxy = () => {
    const { username, password, hosts } = proxyConfig;
    const randomHost = hosts[Math.round(hosts.length * Math.random())];
    return `http://${username}:${password}@${randomHost}`;
};

const getToken = async proxy => {
    const options = {
        method: 'POST',
        uri: 'https://stocktwits.com/api/login',
        body: { user_session: { login: config.username , password: config.password }},
        json: true,
        proxy
    };
    const response = await request(options);
    console.log(
        'stocktwits token',
        response.token
    );
    return response.token;
};

const postPublic = async ({ body, sentiment, token, proxy }) => {
    console.log(`stocktwits ${config.username} posting public: "${body}"`)
    return request({
        method: 'POST',
        uri: 'https://api.stocktwits.com/api/2/messages/create.json',
        headers: {
            'Authorization': `OAuth ${token}`
        },
        formData: {
            body,
            sentiment
        },
        proxy
    });
};

const postToRhRoom = async ({ body, sentiment, proxy }) => {
    console.log(`stocktwits ${config.username} posting to ROOM "${body}" (${sentiment})`);
    return request({
        method: 'POST',
        uri: 'https://roomapi.stocktwits.com/room/robinhood_playground/message',
        headers: {
            'Authorization': `Bearer ${config.bearerToken}`
        },
        formData: {
            alert: 'false',
            body,
            user_sentiment: sentiment
        },
        proxy
    });
};

const postPublicAndRoom = async (ticker, strategy, sentiment) => {
    
    if (DISABLED) {
        return console.log('stocktwits is disabled');
    }
    const body = `$${ticker} ${sentiment} because ${strategy}`;
    const proxy = getProxy();
    const token = await getToken(proxy);
    await postPublic({ body, sentiment, token, proxy });
    console.log( await postToRhRoom({ body, sentiment, token, proxy }) )
};

const postBearish = (ticker, strategy) =>
    postPublicAndRoom(ticker, strategy, 'bearish');

const postBullish = (ticker, strategy) =>
    postPublicAndRoom(ticker, strategy, 'bullish');

module.exports = {
    getToken,
    postBearish,
    postBullish
};