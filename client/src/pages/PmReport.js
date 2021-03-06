import React, { Component } from 'react';

import getTrend from '../utils/get-trend';
import avgArray from '../utils/avg-array';

import Pick from '../components/Pick';
import TrendPerc from '../components/TrendPerc';

class TodaysStrategies extends Component {
    constructor() {
        super();
        this.state = {
            forPurchaseOnly: true
        };
    }
    toggleForPurchaseOnly = () => this.setState({ forPurchaseOnly: !this.state.forPurchaseOnly })
    render() {
        let { pmPerfs, settings, predictionModels } = this.props;
        let { forPurchaseOnly } = this.state;

        if (forPurchaseOnly) {
            const forPurchasePMs = settings.forPurchase.map(line =>
                line.substring(1, line.length - 1)
            );
            console.log({ forPurchasePMs })
            pmPerfs = pmPerfs.filter(perf => 
                forPurchasePMs.includes(perf.pmName)
            );
        }
        return (
            <div style={{ padding: '15px' }}>

                <label>
                    <input type="checkbox" checked={forPurchaseOnly} onChange={this.toggleForPurchaseOnly} />
                    forPurchase PM's only
                </label>
                <table>
                    <thead>
                        <th width="63px">trends</th>
                        <th>prediction model</th>
                    </thead>
                    <tbody>
                        {
                            pmPerfs.map(perf => (
                                <tr>
                                    <td><TrendPerc value={perf.avgTrend} /></td>
                                    <td>{perf.pmName}</td>
                                </tr>
                            ))
                        }
                    </tbody>
                </table>
    {/* 
                <header className="App-header">
                    <h1 className="App-title">current date: {curDate}</h1>
                    prediction model:
                    <button onClick={() => this.strategyMove(-1)}>
                        {'<<'}
                    </button>
                    <select value={pmFilter} onChange={this.setpmFilter}>
                        {predictionModels && Object.keys(predictionModels).map(pm => (
                            <option value={pm}>{pm}</option>
                        ))}
                        <option>no filter</option>
                    </select>
                    <button onClick={() => this.strategyMove(1)}>
                        {'>>'}
                    </button>
                    <br/>
                    include after hours:
                    <input type="checkbox" checked={afterHoursEnabled} onChange={this.toggleAfterHours} />
                </header>
                <p style={{ marginLeft: '20px' }}>
                        {
                            perfs.avgTrend !== perfs.weightedTrend && (
                                <b>weighted trend: <TrendPerc value={perfs.weightedTrend} />&nbsp;&nbsp;&nbsp;</b>
                            )
                        }
                        <b>average trend: <TrendPerc value={perfs.avgTrend} /></b>
                </p>
                <hr/>
                <p className="App-intro">
                    {
                        sortedByAvgTrend.slice(0).map(pick => (
                            <div>
                                <Pick
                                    pick={pick}
                                    key={pick.stratMin}
                                    fiveDay={fiveDay ? fiveDay[pick.stratMin] : null}
                                />
                            </div>
                        ))
                    }
                </p> */}
            </div>
        );
    }
}

export default TodaysStrategies;