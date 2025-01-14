require('../utils')
const { MessageEmbed } = require('discord.js')
const PossibleMaps = require('../game_data/maps.json')
let LocationStrings = ReadJson('./src/game_data/database/locales/global/en.json').locations

function GetMaps() {
    let Result = new Array()

    for (const DisplayName in PossibleMaps) {
        Result.push({
            name: DisplayName,
            value: PossibleMaps[DisplayName]
        })
    }

    return Result
}

let mapIDs = {
    "laboratory": "5b0fc42d86f7744a585f9105",
    "bigmap": "56f40101d2720b2a4d8b45d6",
    "woods": "5704e3c2d2720bac5b8b4567",
    "rezervbase": "5704e5fad2720bc05b8b4567",
    "shoreline": "5704e554d2720bac5b8b456e",
    "interchange": "5714dbc024597771384a510d",
    "factory4_day": "55f2d3fd4bdc2d5f408b4567"
}

module.exports = {
    data: {
        name: 'map',
        description: 'Returns information and maps of a certain location',
        options: [{
            name: 'map',
            description: 'map to get info of',
            required: true,
            type: 3,
            choices: GetMaps()
        }]
    },
    message: (args) => {
        let Map = args['map']

        let MapData = ReadJson(`./src/game_data/database/locations/${Map}/base.json`)
        let MapLootData = ReadJson(`./src/game_data/database/locations/${Map}/loot.json`)

        let mapID = mapIDs[Map]

        let mapName = LocationStrings[mapID].Name

        return {
            Type: "serverMessage",
            Content: new MessageEmbed()
                .setColor(Settings.BotSettings.Color)
                .setTitle(mapName)
                .setDescription(LocationStrings[mapID].Description)
                .setThumbnail(`https://raw.githubusercontent.com/Tarkov-Helper/Image-Database/main/map_icons/${mapName.replace(' ', '%20').toLowerCase()}.png`)
                .addFields(ResolveStrings([{
                    name: 'Map Genie',
                    value: `[Click Here](https://mapgenie.io/tarkov/maps/${mapName.replace('The ', '')})`,
                    inline: true
                }, {
                    name: 'Player Count',
                    value: `${MapData.MinPlayers} - ${MapData.MaxPlayers}`,
                    inline: true
                }, {
                    name: 'Raid Time',
                    value: `${MapData.escape_time_limit} minutes`,
                    inline: true
                }, {
                    name: 'Has Insurance',
                    value: CapitalizeWords(MapData.Insurance.toString()),
                    inline: true
                }, {
                    name: 'Total Loot Containers',
                    value: MapLootData.static.length
                }, {
                    name: 'Extracts',
                    value: MapData.exits.map(exfil => {
                        let properties = new Array()
                        properties.push(`**${exfil.Chance}%** Chance`)
                        properties.push(`**${exfil.ExfiltrationTime}s** Time`)

                        if (exfil.Count !== 0 && exfil.Count !== undefined) {
                            properties.push(`**${FormatPrice(exfil.Count)}** Price`)
                        }
                        return `:small_orange_diamond: \`${exfil.Name.replaceAll('_', ' ').replace('lab', '')}\`: ${properties.join(', ')}`
                    })
                }]))
        }
    }
}