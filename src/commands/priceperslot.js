require('../utils')
const { MessageEmbed } = require('discord.js')

let PriceData = ReadJson('./src/game_data/api/pricedata.json')

module.exports = {
    data: {
        name: 'priceperslot',
        description: 'Returns all items within the specified price per slot value',
        options: [{
            name: 'minimum',
            description: 'minimum price per slot',
            required: true,
            type: 4
        }, {
            name: 'maximum',
            description: 'maximum price per slot',
            required: true,
            type: 4
        }]
    },
    message: (args) => {
        let min = args['minimum']
        let max = args['maximum']

        let items = new Array()

        for (let i in PriceData) {
            let item = PriceData[i].Item

            if (item.PricePerSlot > min && item.PricePerSlot < max) {
                items.push({ name: item.name, id: item.id, pricePerSlot: item.PricePerSlot })
            }
        }

        items = items.sort(function(a, b) {
            return b['pricePerSlot'] - a['pricePerSlot']
        })

        let i = 0
        itemnames = items.map(item => { i++; return `\`${i}\` **-** ${(i % 2 == 0 ? '**' : '')}${item.name}${(i % 2 == 0 ? '**' : '')}` })
        i = 0
        itemprices = items.map(item => { i++; return `\`${i}\` **-** ${(i % 2 == 0 ? '**' : '')}${FormatPrice(item.pricePerSlot)}${(i % 2 == 0 ? '**' : '')}` })

        if (items.length > 30) {
            return {
                Type: 'Error',
                Content: ErrorMessage('Too many items within that range, please pick and smaller range')
            }
        }

        return {
            Type: 'serverMessage',
            Content: new MessageEmbed()
                .setTitle(`Price Per Slot Range: ${FormatPrice(min)} - ${FormatPrice(max)}`)
                .setThumbnail(Settings.Images.Thumbnails.PricePerSlot)
                .addFields(ResolveStrings([{
                    name: 'Items',
                    value: itemnames,
                    inline: true
                }, {
                    name: 'Prices',
                    value: itemprices,
                    inline: true
                }]))
        }
    }
}