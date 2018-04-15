// const cancelAllOrders = require('../rh-actions/cancel-all-orders');
const getTrendAndSave = require('./get-trend-and-save');
// const purchaseStocks = require('./purchase-stocks');
const recordPicks = require('./record-picks');
const { lookupTickers } = require('./record-strat-perfs');

const executeStrategy = async (Robinhood, strategyFn, min, ratioToSpend, strategy, pricePermFilter) => {

    console.log('executing strategy', strategy, min);
    const record = async (stocks, strategyName, tickerLookups) => {
        const withPrices = stocks.map(ticker => {
            return {
                ticker,
                price: tickerLookups[ticker]
            };
        });
        await recordPicks(Robinhood, strategyName, min, withPrices);
    };

    const trend = await getTrendAndSave(Robinhood, min + '*');

    let pricePerms = {
        under5: [0, 5],
        fiveTo10: [5, 10],
        tenTo15: [10, 15]
    };

    if (pricePermFilter) {
        Object.keys(pricePerms)
            .filter(priceKey => !pricePermFilter.includes(priceKey))
            .forEach(priceKey => {
                console.log('deleting', priceKey);
                delete pricePerms[priceKey];
            });
    }

    for (let priceKey of Object.keys(pricePerms)) {

        const trendFilteredByPricePerm = trend.filter(stock => {
            return Number(stock.quote_data.last_trade_price) > pricePerms[priceKey][0] && Number(stock.quote_data.last_trade_price) < pricePerms[priceKey][1];
        });
        const toPurchase = await strategyFn(Robinhood, trendFilteredByPricePerm);
        console.log(toPurchase, 'toPurchase');

        // gives ability to return an object from a trendFilter with multiple "variations"

        const priceFilterSuffix = (priceKey === 'under5') ? '' : `-${priceKey}`;

        if (!Array.isArray(toPurchase)) {
            // its an object
            const allTickers = [...new Set(
                Object.keys(toPurchase).map(strategyName => {
                    return toPurchase[strategyName];
                }).reduce((acc, val) => acc.concat(val), []) // flatten
            )];
            console.log('alltickers', allTickers);
            const tickerLookups = await lookupTickers(Robinhood, allTickers);
            console.log('tickerLookups', tickerLookups);
            for (let strategyName of Object.keys(toPurchase)) {
                const subsetToPurchase = toPurchase[strategyName];
                await record(subsetToPurchase, `${strategy}-${strategyName}${priceFilterSuffix}`, tickerLookups);
            }
        } else {
            await record(toPurchase, `${strategy}${priceFilterSuffix}`), await lookupTickers(Robinhood, toPurchase);
        }

    }


};

module.exports = executeStrategy;
