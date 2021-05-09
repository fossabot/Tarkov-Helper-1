// Command Config
const CommandSettings = {
    data: {
        name: 'fee',
        description: 'ADMIN COMMAND: Assign an admin role so that role can use admin commands',
        options: [{
            type: 3,
            name: 'item',
            description: 'Item to calculate fee of',
            required: true
        }, {
            type: 4,
            name: 'amount',
            description: 'Amount of the item to sell',
            required: true
        }, {
            type: 4,
            name: 'price',
            description: 'Price to sell item. Leave blank to use lowest price on Flea Market',
            required: false
        }]
    }
}

const { MessageEmbed } = require('discord.js')
const { PriceInfo } = require('../classes/priceinfo')
const ItemFromName = require('../game_data/api/itemfromname.json')
const { ItemSearchEngine } = require('../command_modules/itemsearchengine')
const { ErrorMessage, ErrorMessageField } = require('../command_modules/errormessage')

// Command Functions
const CommandFunction = (args) => {
    let Item = ItemSearchEngine(args['item'].toLowerCase())
    let Amount = args['amount']

    let Length = Item.length
    console.log(Length)
    if (Length === 1) {
        let PriceData = new PriceInfo(ItemFromName[Item[0]].ID)

        if (PriceData !== undefined) {
            let Price = args['price'] || PriceData.PriceData.avg24hPrice

            return new MessageEmbed()
                .setTitle(`${PriceData.PriceData.shortName} Fee Calculation`)
                .setThumbnail(`https://raw.githubusercontent.com/RatScanner/EfTIcons/master/uid/${PriceData.PriceData.id}.png`)
                .setDescription(`Fee and Profit are being calculated using a total sell of ${Amount} items \n [Wiki Link To Item](${PriceData.PriceData.wikiLink})`)
                .addFields({
                    name: 'Fee',
                    value: FormatNumber(Math.round(CalcFee(PriceData.PriceData.basePrice, Price, Amount))) + '₽'
                }, {
                    name: 'Flea Market Price',
                    value: FormatNumber(PriceData.PriceData.avg24hPrice) + '₽/each'
                }, {
                    name: 'Profit',
                    value: FormatNumber(((PriceData.PriceData.avg24hPrice * Amount) - Math.round(CalcFee(PriceData.PriceData.basePrice, Price, Amount)))) + '₽'
                })
        } else {
            return ErrorMessage('Unable to grab price data please try again later')
        }
    } else if (Length > 1 && Length < 25) {
        return ErrorMessageField(`Item search of \"${args['item'].toLowerCase().replace('short=','')}\" came back with multiple results, please be more specific. [Click here](${Settings.ItemArrayLink}) to see a list of all possible entries`, {
            name: 'Results',
            value: Item
        })
    } else if (Length > 25) {
        return ErrorMessage(`Item search of \"${args['item'].toLowerCase().replace('short=','')}\" came back with over 25 results, please be more specific. [Click here](${Settings.ItemArrayLink}) to see a list of all possible entries`)
    } else {
        return ErrorMessage(`Item search of \"${args['item'].toLowerCase().replace('short=','')}\" came back with no results. [Click here](${Settings.ItemArrayLink}) to see a list of all possible entries`)
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

const FormatNumber = (n) => {
    return String(n).replace(/(.)(?=(\d{3})+$)/g, '$1,')
}

exports.CommandFunction = CommandFunction
exports.CommandSettings = CommandSettings