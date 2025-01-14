require('../utils')
const { MessageEmbed } = require('discord.js')
const { PriceInfo } = require('../classes/priceinfo')
const ItemFromName = ReadJson('./src/game_data/api/itemfromname.json')
const { ItemSearchEngine } = require('../command_modules/itemsearchengine')

module.exports = {
    data: {
        name: 'fee',
        description: 'Calculate the fee for the sell price of an item or amount of items and the profit',
        options: [{
            type: 3,
            name: 'item',
            description: 'Item to calculate fee of',
            required: true
        }, {
            type: 4,
            name: 'amount',
            description: 'Amount of the item to sell',
            required: false
        }, {
            type: 4,
            name: 'price',
            description: 'Price to sell item. Leave blank to use lowest price on Flea Market',
            required: false
        }]
    },
    message: (args, { interaction, uid }) => {
        let Item = ItemSearchEngine(args['item'].toLowerCase())
        let Amount = args['amount'] || 1

        let Length = Item.length

        if (Length === 1) {
            let PriceData = new PriceInfo(ItemFromName[Item[0]].ID)

            if (PriceData !== undefined) {
                let Price = args['price'] || PriceData.PriceData.avg24hPrice

                return {
                    Type: "serverMessage",
                    Content: new MessageEmbed()
                        .setColor(Settings.BotSettings.Color)
                        .setTitle(`${PriceData.PriceData.shortName} Fee Calculation`)
                        .setThumbnail(`https://raw.githubusercontent.com/Tarkov-Helper/Image-Database/main/item_icons/${PriceData.PriceData.id}.png`)
                        .setDescription(`Fee and Profit are being calculated using a total sell of ${Amount} items \n [Wiki Link To Item](${PriceData.PriceData.wikiLink})`)
                        .addFields({
                            name: 'Fee',
                            value: FormatPrice(Math.round(CalcFee(PriceData.PriceData.basePrice, Price, Amount)))
                        }, {
                            name: 'Flea Market Price',
                            value: FormatPrice(Price) + '/each'
                        }, {
                            name: 'Profit',
                            value: FormatPrice(((Price * Amount) - Math.round(CalcFee(PriceData.PriceData.basePrice, Price, Amount))))
                        })
                }
            } else {
                return { Type: "error", Content: ErrorMessage('Unable to grab price data please try again later'), Time: 5000 }
            }
        } else if (Length > 1 && Length < 25) {
            return CreateSearchInput(Item, args, 'item', 'fee')
        } else if (Length > 25) {
            return { Type: "error", Content: ErrorMessage(`Item search of \"${args['item'].toLowerCase().replace('short=','')}\" came back with over 25 results, please be more specific. [Click here](${Settings.ItemArrayLink}) to see a list of all possible entries`), Time: 5000 }
        } else {
            return { Type: "error", Content: ErrorMessage(`Item search of \"${args['item'].toLowerCase().replace('short=','')}\" came back with no results. [Click here](${Settings.ItemArrayLink}) to see a list of all possible entries`), Time: 5000 }
        }
    }
}

function CalcFee(BasePrice, ItemPrice, Amount = 1) {
    // Function from tarkov-tools fee calculator script
    // https://github.com/kokarn/tarkov-tools/blob/master/src/modules/flea-market-fee.js
    let V0 = BasePrice
    let VR = (ItemPrice - 1)
    let Ti = 0.05
    let Tr = 0.05
    let P0 = Math.log10(V0 / VR)
    let PR = Math.log10(VR / V0)
    let Q = Amount

    if (VR < V0) {
        P0 = Math.pow(P0, 1.08)
    }

    if (VR >= V0) {
        PR = Math.pow(PR, 1.08)
    }

    return Math.ceil(V0 * Ti * Math.pow(4, P0) * Q + VR * Tr * Math.pow(4, PR) * Q)
}