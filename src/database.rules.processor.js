var YAML = require('yamljs')
var path = require('path')
var fs = require('fs')

module.exports = (middleware = []) => {
    const pathToYaml = './glacier.yml'
    const outputPath = './firebase_spec/'

    fs.readFile(path.resolve(pathToYaml), 'utf8', (err, data) => {
        if(err) {
            return console.log('Missing glacier document at current directory (./glacier.yml)')
        }

        // Generate object from yaml data
        var glacier = YAML.parse(data) || {}

        // Invoke middleware
        for(var i = 0; i < middleware.length; i++) {
            glacier = middleware[i](glacier)
        }

        // Generate new object without metadata fields (those starting with $)
        var db = glacier.database !== undefined ? glacier.database : {}
        const removeMetadata = (data) => {
            let objWithoutMeta = {}
            if (Object.prototype.toString.call(data) === '[object Array]') {
                objWithoutMeta = []
            }
            for(let key in data) {
                if(data.hasOwnProperty(key)) {
                    if(key[0] !== '$'){
                        if(Object.prototype.toString.call(data[key]) === '[object Object]' || Object.prototype.toString.call(data[key]) === '[object Array]') {
                            objWithoutMeta[key] = removeMetadata(data[key])
                        } else if(typeof(data[key]) === 'string' || typeof(data[key]) === 'number' || typeof(data[key]) === 'boolean') {
                            objWithoutMeta[key] = data[key]
                        }
                    }
                }
            }
            return objWithoutMeta
        }
        db = removeMetadata(db)

        // Generate new object without slashes
        const removeSlashes = (data) => {
            let objWithoutSlashes = {}
            if (Object.prototype.toString.call(data) === '[object Array]') {
                objWithoutSlashes = []
            }
            for(let key in data) {
                if(data.hasOwnProperty(key)) {
                    let _key = key
                    if(key[0] === '/') {
                        _key = key.slice(1)
                    }
                    if(Object.prototype.toString.call(data[key]) === '[object Object]' || Object.prototype.toString.call(data[key]) === '[object Array]') {
                        objWithoutSlashes[_key] = removeSlashes(data[key])
                    } else if(typeof(data[key]) === 'string' || typeof(data[key]) === 'number' || typeof(data[key]) === 'boolean') {
                        objWithoutSlashes[_key] = data[key]
                    }
                }
            }
            return objWithoutSlashes
        }
        db = removeSlashes(db)

        // Create outputPath directory if doesn't exists
        if (!fs.existsSync(outputPath)){
            fs.mkdirSync(outputPath);
        }

        // Write to outputPath
        fs.writeFile(path.resolve(outputPath + 'database.rules.json'), JSON.stringify({ rules: db }, null, 2) + '\n', 'utf8', (err) => {
            if(err) {
                console.log(err)
            }
        })
    })
}