#!/user/bin/env node

import chalk from 'chalk';
import inquirer from 'inquirer';
import gradient from 'gradient-string';
import chalkAnimation from 'chalk-animation';
import figlet from 'figlet';
import { createSpinner } from 'nanospinner';
import fetch from 'node-fetch'

const DIGITRANSIT_URL = 'https://api.digitransit.fi/routing/v1/routers/hsl/index/graphql'

const stopsToFollow = [
    {
        id: 'HSL:4950201',
        color: '#eb4034',
        timeToWalk: 6
    },
    {
        id: 'HSL:1471147',
        color: '#346eeb',
        timeToWalk: 7
    }
]

const sleep = (ms = 60000) => new Promise((r) => setTimeout(r, ms));

function header() {

    figlet('HSL', (err, data) => {
        console.log(gradient.pastel.multiline(data) + '\n');
    })
}

async function getStopData() {
    const spinner = createSpinner('Haetaan pysäkkien aikatauluja').start();

    await sleep(2000);

    return fetch(DIGITRANSIT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            query: `{
            stops(ids:[${stopsToFollow.map(({ id }) => `"${id}"`).toString()}]){
              gtfsId,
              name,
              stoptimesWithoutPatterns{
                trip{
                  routeShortName,
                  tripHeadsign
                },
                realtimeArrival
              }
            }
          }`})
    })
        .then(r => r.json())
        .then(({ data }) => {
            spinner.stop()
            header();
            spinner.success({
                text: 'Pysäkkien aikataulut noudettu ' + chalk.cyan.bold(new Date().toLocaleString('fi-FI'))
            })

            data.stops.map((s) => printStop(s))
        })
        .catch((res) => {
            spinner.error({ text: "Virhe:" + res })
            process.exit(1);
        })
        .finally(async () => {
            await sleep();
            return await getStopData();

        })
}

function printStop(stop) {

    const followedStop = stopsToFollow.find(({ id }) => id === stop.gtfsId)

    console.log(`
    ${chalk.hex(followedStop.color).bold(`${stop.name} - ${followedStop.timeToWalk} min 🚶`)}
    `)

    stop.stoptimesWithoutPatterns.map(({ trip, realtimeArrival }) => {
        console.log(`   
        ${toRelativeMinutes(realtimeArrival, followedStop.timeToWalk)} ${chalk.hex(followedStop.color).inverse(' ' + trip.routeShortName + ' ')} -> ${trip.tripHeadsign}
        `)

    })
}

function toRelativeMinutes(seconds, timeToWalk) {
    const date = new Date();
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const secondsSinceMidnight = (Date.now() - startOfDay.getTime()) / 1000

    const relativeMinutes = Math.round((seconds - secondsSinceMidnight) / 60);

    if (relativeMinutes <= timeToWalk + 5 && relativeMinutes > timeToWalk) {
        return chalk.yellow(relativeMinutes + ' min')
    } else if (relativeMinutes <= timeToWalk) {
        return chalk.red(relativeMinutes + ' min')
    } else {
        return relativeMinutes + ' min'
    }

}

console.clear();
header();
await getStopData();

