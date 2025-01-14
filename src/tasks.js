require('./utils')
let decompress = require('decompress')
let download = require('download')
const moment = require('moment-timezone')
const { scheduleJob } = require('node-schedule')
const got = require('got')
const fs = require('fs')

let { GetAmmo } = require('./scripts/ammo')

// Update database every 3 hours
async function Database() {
    try {
        fs.rmSync('./src/game_data/temp', { recursive: true })
        fs.mkdirSync('./src/game_data/temp')
    } catch { }

    await download('https://github.com/Tarkov-Helper/Database/archive/refs/heads/main.zip', './src/game_data/temp')
    await decompress('./src/game_data/temp/main.zip', './src/game_data/temp')

    let DownloadedFiles = fs.readdirSync('./src/game_data/temp/Database-main')
    for (let File of DownloadedFiles) {
        try { fs.rmSync(`./src/game_data/${File}`, { recursive: true }) } catch { }
        fs.renameSync(`./src/game_data/temp/Database-main/${File}`, `./src/game_data/${File}`)
    }

    fs.rmSync('./src/game_data/temp', { recursive: true })

    return 'Done'
}
const UpdateDatabase = scheduleJob('0 */3 * * *', async function () {
    Logger(`Updating database...`)

    try {

        await Database()

        Logger(`Updated database successfully`)

    } catch (e) {
        console.log(e)
        Logger(`Error updating database, waiting till next cycle`)
    }
})

// Update price data every 10 minutes
const UpdatePrices = scheduleJob('*/10 * * * *', async function () {
    Logger(`Updating prices...`)

    try {
        const bodyQuery = JSON.stringify({
            query: `{
                itemsByType(type: any) {
                    id
                    name
                    shortName
                    avg24hPrice
                    lastLowPrice
                    changeLast48h
                    width
                    height
                    imageLink
                    wikiLink
                    basePrice
                    traderPrices {
                        price
                        trader {
                          name
                        }
                    }
                    sellFor {
                        source
                        price
                        requirements {
                            type
                            value
                        }
                    }
                    buyFor {
                        source
                        price
                        requirements {
                            type
                            value
                        }
                    }
                    types
                }
            }`
        })
        const response = await got.post('https://tarkov-tools.com/graphql', {
            body: bodyQuery,
            responseType: 'json',
        })

        let NewPrices = {}

        for (const i in response.body.data.itemsByType) {
            let Item = response.body.data.itemsByType[i]
            Item.PricePerSlot = Math.round(Item.avg24hPrice / (Item.width * Item.height))
            NewPrices[Item.id] = {
                Item
            }
        }

        fs.writeFileSync('./src/game_data/api/pricedata.json', JSON.stringify(NewPrices, null, 4))

        let Updated = ReadJson('./src/bot_data/updated.json')
        Updated.Prices = GetTime() + ' EST'
        fs.writeFileSync('./src/bot_data/updated.json', JSON.stringify(Updated, null, 4))

        Logger(`Updated prices successfully`)

        require('./command_modules/notify').GenerateNotifications()

    } catch (e) {
        console.log(e)
        Logger(`Error updating prices, waiting till next cycle`)
    }
})

const PriceHistory = scheduleJob('*/30 * * * *', async function () {
    Logger('Logging Prices...')

    let ItemData = ReadJson('./src/game_data/api/itemdata.json')
    let PriceData = ReadJson('./src/game_data/api/pricedata.json')

    const priceHistoryDir = './src/game_data/pricehistory/'

    let date = GetMilis()
    const file = priceHistoryDir + moment(date).format('MM-DD-YYYY').toUpperCase() + '.json'

    let history = {}

    if (fs.existsSync(file)) {
        history = ReadJson(file)
    } else {
        Object.keys(ItemData).forEach(id => {
            history[id] = []
        })
    }

    for (let id in history) {
        let price = PriceData[id].Item.lastLowPrice

        history[id].push({ price, date })
    }

    WriteJson(file, history)

    Logger('Logged Prices')
})

// Update item data daily
const UpdateItems = scheduleJob('@daily', async function () {
    Logger(`Updating items...`)

    const RawGameData = require('./game_data/database/templates/items.json')

    try {

        let AmmoData = await GetAmmo()

        const bodyQuery = JSON.stringify({
            query: `{
            itemsByType(type: any) {
                name
                shortName
                normalizedName
                id
                types
                imageLink
                iconLink
                wikiLink
            }
        }`
        })
        const response = await got.post('https://tarkov-tools.com/graphql', {
            body: bodyQuery,
            responseType: 'json',
        })
        let ApiData = response.body.data.itemsByType

        let ItemData = {}
        let ItemFromID = {}
        let ItemFromName = {}
        let ItemFromShortName = {}
        let ItemIDs = new Array()
        let ItemArray = new Array()

        for (const Item of ApiData) {
            if (Item.name !== undefined) {
                ItemData[Item.id] = {
                    ID: Item.id,
                    Name: Item.name,
                    ShortName: Item.shortName,
                    WikiLink: Item.wikiLink,
                    Types: Item.types,
                    Image: Item.iconLink,
                    RawData: RawGameData[Item.id]
                }
                ItemFromName[Item.name] = {
                    Name: Item.name,
                    ShortName: Item.shortName,
                    ID: Item.id,
                    Types: Item.types,
                }
                ItemFromShortName[Item.shortName.toLowerCase()] = {
                    Name: Item.name,
                    ShortName: Item.shortName,
                    ID: Item.id,
                    Types: Item.types,
                }
                ItemFromID[Item.id] = {
                    Name: Item.name,
                    ShortName: Item.shortName,
                    ID: Item.id,
                    Types: Item.types,
                }
                ItemArray.push(Item.name)
                ItemIDs.push(Item.id)
            }
        }

        for (let AmmoID in AmmoData) {
            let Ammo = AmmoData[AmmoID]

            if (ItemData[AmmoID]) {
                if (ItemData[AmmoID].RawData === undefined) {
                    ItemData[AmmoID]['RawData'] = {
                        Data: {
                            Damage: Ammo.damage,
                            ArmorDamage: Ammo.armorDamage,
                            PenetrationPower: Ammo.penetration
                        }
                    }
                } else {
                    ItemData[AmmoID].RawData._props['Damage'] = Ammo.damage
                    ItemData[AmmoID].RawData._props['ArmorDamage'] = Ammo.armorDamage
                    ItemData[AmmoID].RawData._props['PenetrationPower'] = Ammo.penetration
                }
            }
        }

        fs.writeFileSync('./src/game_data/api/itemfromshortname.json', JSON.stringify(ItemFromShortName, null, 4))
        fs.writeFileSync('./src/game_data/api/itemfromname.json', JSON.stringify(ItemFromName, null, 4))
        fs.writeFileSync('./src/game_data/api/itemfromid.json', JSON.stringify(ItemFromID, null, 4))
        fs.writeFileSync('./src/game_data/api/itemdata.json', JSON.stringify(ItemData, null, 4))
        fs.writeFileSync('./src/game_data/api/itemarray.json', JSON.stringify(ItemArray, null, 4))
        fs.writeFileSync('./src/game_data/api/itemids.json', JSON.stringify(ItemIDs, null, 4))

        let Updated = ReadJson('./src/bot_data/updated.json')
        Updated.Other = GetTime() + ' EST'
        fs.writeFileSync('./src/bot_data/updated.json', JSON.stringify(Updated, null, 4))


        Logger(`Updated items successfully`)

    } catch (e) {
        console.log(e)
        Logger(`Error updating items, waiting till next cycle`)
    }

})

// Update quest data every 24 hours
const UpdateQuests = scheduleJob('@daily', async function () {
    Logger(`Updating quests...`)

    let ExtraData = await got('https://raw.githubusercontent.com/TarkovTracker/tarkovdata/master/quests.json', {
        responseType: 'json',
    })
    ExtraData = ExtraData.body

    try {
        const bodyQuery = JSON.stringify({
            query: `{
                quests {
                    title
                    wikiLink
                    exp
                    unlocks
                }
            }`
        })
        const response = await got.post('https://tarkov-tools.com/graphql', {
            body: bodyQuery,
            responseType: 'json',
        })
        let QuestData = response.body.data.quests

        let FormattedData = {}
        for (const Quest in QuestData) {
            FormattedData[QuestData[Quest].title] = QuestData[Quest]
        }

        let QuestNames = new Array()
        for (const Quest in QuestData) {
            QuestNames.push(QuestData[Quest].title)
        }

        for (const Quest of ExtraData) {
            let QuestData = FormattedData[Quest.title]

            try {
                if (Quest.nokappa !== undefined) {
                    QuestData.Kappa = false
                } else {
                    QuestData.Kappa = true
                }
                QuestData.Objectives = Quest.objectives
            } catch { }

        }

        fs.writeFileSync('./src/game_data/api/quests.json', JSON.stringify(FormattedData, null, 4))
        fs.writeFileSync('./src/game_data/api/questnames.json', JSON.stringify(QuestNames, null, 4))

        Logger(`Updated quests successfully`)

    } catch (e) {
        console.log(e)
        Logger(`Error updating quests, waiting till next cycle`)
    }

})

// Update quest data every 24 hours
const UpdateBarters = scheduleJob('@daily', async function () {
    Logger(`Updating barters...`)

    try {
        const bodyQuery = JSON.stringify({
            query: `{
                barters {
                    source
                    requiredItems {
                        count
                        item {
                            name
                            shortName
                            id
                            wikiLink
                        }
                    }
                    rewardItems {
                        count
                        item {
                            name
                            shortName
                            id
                            wikiLink
                        }
                    }
                }
            }`
        })
        const response = await got.post('https://tarkov-tools.com/graphql', {
            body: bodyQuery,
            responseType: 'json',
        })

        let BarterData = response.body.data.barters

        let FormattedData = {}

        for (const Barter of BarterData) {
            let Reward = Barter.rewardItems[0]
            let RewardID = Reward.item.id

            if (FormattedData[RewardID] === undefined) { FormattedData[RewardID] = new Array() }

            let BarterScheme = {
                Trader: Barter.source,
                RequiredItems: new Array(),
                Reward: {
                    Amount: Reward.count,
                    Name: Reward.item.name,
                    ShortName: Reward.item.shortName,
                    ID: RewardID,
                    WikiLink: Reward.item.wikiLink
                }
            }

            for (const Ingredient of Barter.requiredItems) {
                BarterScheme.RequiredItems.push({
                    Amount: Ingredient.count,
                    Name: Ingredient.item.name,
                    ShortName: Ingredient.item.shortName,
                    ID: Ingredient.item.id,
                    WikiLink: Ingredient.item.wikiLink
                })
            }

            FormattedData[RewardID].push(BarterScheme)
        }

        fs.writeFileSync('./src/game_data/api/barters.json', JSON.stringify(FormattedData, null, 4))

        Logger(`Updated barters successfully`)
    } catch (e) {
        console.log(e)
        Logger(`Error updating barters, waiting till next cycle`)
    }

})

const StartTasks = async () => {
    try {
        fs.mkdirSync('./src/game_data/api')
    } catch { }

    // Run updates at startup
    UpdatePrices.invoke()
    UpdateItems.invoke()
    UpdateQuests.invoke()
    UpdateBarters.invoke()

    // Start the intervalled updates
    UpdateDatabase.schedule()
    UpdatePrices.schedule()
    UpdateItems.schedule()
    UpdateQuests.schedule()
    UpdateBarters.schedule()
    PriceHistory.schedule()
}

// Seperate function since we need to invoke this before anything else since this downloads data used by the other updates
async function InvokeDatabase() {
    await UpdateDatabase.invoke()
    return 'Done'
}

exports.InvokeDatabase = InvokeDatabase
exports.StartTasks = StartTasks