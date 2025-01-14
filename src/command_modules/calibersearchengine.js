require('../utils')
const AccurateSearch = require('accurate-search')

const ItemData = ReadJson('./src/game_data/api/itemdata.json')
const PriceData = ReadJson('./src/game_data/api/pricedata.json')

let SearchEngine = new AccurateSearch()

let CaliberData = {}
let Calibers = new Array()

function InitEngine() {
    for (const i in ItemData) {
        let Item = ItemData[i]

        if (Item.Types.includes('ammo') && !Item.Types.includes('grenade') && !Item.Name.includes('pcs.')) {
            let Caliber = Item.Name.split(' ')[0].replace('mm', '') // Gives better result then using 'RawData.Caliber'

            if (CaliberData[Caliber] === undefined) {
                SearchEngine.addText(Caliber, Caliber)
                Calibers.push(Caliber)
                SearchEngine.addText(Caliber, Caliber.replace('.', ''))
                CaliberData[Caliber] = new Array()
            }

            try {
                let RawData = Item.RawData._props
                let itemPriceData = PriceData[i].Item

                CaliberData[Caliber].push({
                    Name: Item.ShortName,
                    ID: Item.ID,
                    Damage: RawData.Damage,
                    ArmorDamage: RawData.ArmorDamage,
                    Penetration: RawData.PenetrationPower
                })
            } catch { }
        }
    }
}

function GetCalibers() {
    return Calibers
}

const Engine = (Input) => {
    let Results = SearchEngine.search(Input.replace(' ', 'x'))

    return { Results: Results, CaliberData: CaliberData }
}

exports.GetCalibers = GetCalibers
exports.InitCaliberEngine = InitEngine
exports.CaliberSearchEngine = Engine