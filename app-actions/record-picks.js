// const fs = require('mz/fs');
// const jsonMgr = require('../utils/json-mgr');
// const lookup = require('../utils/lookup');
// const mapLimit = require('promise-map-limit');
const lookupMultiple = require('../utils/lookup-multiple');
const stratManager = require('../socket-server/strat-manager');
const Pick = require('../models/Pick');
const stratOfInterest = require('../utils/strat-of-interest');

const purchaseStocks = require('./purchase-stocks');
const sendEmail = require('../utils/send-email');
const tweeter = require('./tweeter');
const calcEmailsFromStrategy = require('../utils/calc-emails-from-strategy');
const stocktwits = require('../utils/stocktwits');
const { disableMultipliers } = require('../settings');

const saveToFile = async (Robinhood, strategy, min, withPrices) => {


    const stratMin = `${strategy}-${min}`;

    if (!stratOfInterest(stratMin, withPrices.length)) return;   // cant handle too many strategies apparently
    if (!strategy.includes('cheapest-picks')) withPrices = withPrices.slice(0, 3);  // take only 3 picks

    withPrices = withPrices.filter(tickerPrice => !!tickerPrice);
    if (!withPrices.length) {
        return console.log(`no stocks found for ${stratMin}`)
    }

    // console.log('recording', stratMin, 'strategy');

    const dateStr = (new Date()).toLocaleDateString().split('/').join('-');

    // save to mongo
    console.log(`saving ${strategy} to mongo`);
    await Pick.create({
        date: dateStr, 
        strategyName: strategy,
        min,
        picks: withPrices
    });

    // for socket-server
    stratManager.newPick({
        stratMin,
        withPrices
    });

    // for email$
    const emailsToSend = await calcEmailsFromStrategy(null, stratMin);
    // console.log({ emailsToSend });
    for (let { email, pm } of emailsToSend) {
        await sendEmail(
            `robinhood-playground${pm ? `-${pm}` : ''}: ${stratMin}`,
            JSON.stringify(withPrices, null, 2),
            email
        );
    }

    // helper
    const getEnableCountForPM = pm => { 
        // how many times does this strategy show up in this pm?
        const stratsWithinPM = stratManager.predictionModels ? stratManager.predictionModels[pm] : [];
        return stratsWithinPM.filter(strat => strat === stratMin).length;
    };

    // stocktwits
    // if (getEnableCountForPM('allShorts')) {
    //     if (withPrices.length === 1) {
    //         const [{ ticker }] = withPrices;
    //         await stocktwits.postBearish(ticker, stratMin);
    //     }
    //     // tweeter.tweet(`SHORT ${withPrices.map(({ ticker, price }) => `#${ticker} @ $${price}`).join(' and ')} - ${stratMin}`);
    // }

    // for purchase
    const forPurchaseMultiplier = getEnableCountForPM('forPurchase');
    if (forPurchaseMultiplier) {
        console.log('strategy enabled: ', stratMin, 'purchasing');
        const stocksToBuy = withPrices.map(obj => obj.ticker);
        await purchaseStocks(Robinhood, {
            stocksToBuy,
            strategy,
            multiplier: !disableMultipliers ? forPurchaseMultiplier : 1,
            min,
            withPrices
        });
        if (withPrices.length === 1) {
            const [{ ticker }] = withPrices;
            await stocktwits.postBullish(ticker, stratMin);
        }
        // tweeter.tweet(`BUY ${withPrices.map(({ ticker, price }) => `#${ticker} @ $${price}`).join(' and ')} - ${stratMin}`);
    }

};





module.exports = async (Robinhood, strategy, min, toPurchase, priceFilterSuffix = '') => {

    const isNotRegularHours = min < 0 || min > 390;

    const record = async (stocks, strategyName, tickerLookups) => {
        const withPrices = stocks.map(ticker => {
            const relatedLookup = tickerLookups[ticker];
            const price = isNotRegularHours ? 
                relatedLookup.afterHoursPrice || relatedLookup.lastTradePrice: 
                relatedLookup.lastTradePrice;
            return {
                ticker,
                price
            };
        });
        await saveToFile(Robinhood, strategyName, min, withPrices);
    };

    if (!Array.isArray(toPurchase)) {
        // its an object
        const allTickers = [...new Set(
            Object.keys(toPurchase)
                .map(strategyName => toPurchase[strategyName])
                .reduce((acc, val) => acc.concat(val), []) // flatten
        )];
        // console.log('alltickers', allTickers);
        const tickerLookups = await lookupMultiple(Robinhood, allTickers, true);
        // console.log('tickerLookups', tickerLookups);
        for (let strategyName of Object.keys(toPurchase)) {
            const subsetToPurchase = toPurchase[strategyName];
            await record(subsetToPurchase, `${strategy}-${strategyName}${priceFilterSuffix}`, tickerLookups);
        }
    } else {
        // console.log('no variety to purchase', toPurchase);
        const tickerLookups = await lookupMultiple(Robinhood, toPurchase, true);
        // console.log('ticker lookups', tickerLookups);
        await record(toPurchase, `${strategy}${priceFilterSuffix}`, tickerLookups);
    }

};
