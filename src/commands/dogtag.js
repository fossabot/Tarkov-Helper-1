// Command Config
const CommandSettings = {
    CommandData: {
        data: {
            name: 'dogtag',
            description: 'Gets the price of a dogtag',
            options: [{
                name: 'level',
                description: 'Level of the dogtag',
                required: true,
                type: 3
            }]
        }
    },
    DMCommand: true
}

const { ErrorMessage, ErrorMessageField } = require('../command_modules/errormessage')
const { MessageEmbed } = require('discord.js')

// Command Functions
const CommandFunction = (args) => {
    let Level = args['level']

    if (Level > 70 || Level < 1) {
        return {
            Type: "Error",
            Content: ErrorMessage('Please enter a valid level between 1 and 70')
        }
    } else {
        return {
            Type: "ServerMessage",
            Content: new MessageEmbed()
                .setTitle('Dogtag Price')
                .setThumbnail(`https://raw.githubusercontent.com/RatScanner/EfTIcons/master/uid/59f32c3b86f77472a31742f0.png`)
                .addFields({
                    name: 'Level Of Dogtag',
                    value: Level
                }, {
                    name: 'Price Of Dogtag',
                    value: (Level * 378)
                })
        }
    }
}

exports.CommandFunction = CommandFunction
exports.CommandSettings = CommandSettings