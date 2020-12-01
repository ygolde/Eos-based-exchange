const Country = require('../models/countries')
const States = require('../models/states')
const Cities = require('../models/cities')
const countries = require('./countries.json')
const states = require('./states.json')
const cities = require('./cities.json')

class Geolocation {

    constructor(db) {
        this.db = db
        this.countries = countries
        this.states = states
        this.cities = cities
    }

    async load_countries() {
        return new Promise(async (resolve, reject) => {
            Country.insertMany(this.countries, (err, doc) => {
                if (err) {
                    return reject(err)
                }
                return resolve()
            })
        })
    }

    async load_states() {
        return new Promise(async (resolve) => {
            try {
                const promises = states.map(async state => {
                    let country = await Country.findOne({ id: state['country_id'] }).exec()
                    return {
                        id: state['id'],
                        name: state['name'],
                        country_id: country['_id']
                    }
                })
                const docs = await Promise.all(promises)
                const inserted = await States.insertMany(docs)
                resolve(inserted)
            } catch (err) {
                console.log(err)
                reject(err)
            }
        })
    }

    async load_cities() {
        return new Promise(async (resolve, reject) => {
            try {
                const promises = cities.map(async city => {
                    let state = await States.findOne({ id: city['state_id'] }).exec()
                    if (state !== null) {
                        let country = await Country.findOne({ _id: state['country_id'] }).exec()
                        return {
                            id: city['id'],
                            name: city['name'],
                            state_id: state['_id'],
                            country_id: country['_id']
                        }
                    }
                    return
                })
                const docs = await Promise.all(promises)
                const inserted = await Cities.insertMany(docs)
                resolve(inserted)
            } catch (err) {
                reject(err)
            }
        })
    }


    async get_all_countries() {
        return new Promise(async (resolve, reject) => {
            try {
                const _countries = await Country.find({})
                resolve(_countries)
            }
            catch (err) {
                reject(err)
            }
        })
    }

    async get_states() {
        return new Promise(async (resolve, reject) => {
            try {
                const _states = await States.find({}).populate('country_id').exec()
                return resolve(_states)
            }
            catch (err) {
                return reject(err)
            }
        })
    }

    async get_cities() {
        return new Promise(async (resolve, reject) => {
            try {
                const _cities = await Cities.find({}).populate('state_id').populate('country_id').exec()
                return resolve(_cities)
            }
            catch (err) {
                console.log(err)
                return reject(err)
            }
        })
    }


    async add_country(country) {
        return new Promise(async (resolve) => {
            const isFind = await Country.find({ '_id': country['_id'] })
            if (isFind.length) {
                const updated = await Country.updateOne({ _id: country['_id'] }, { name: country['name'], sortname: country['sortname'], phonecode: country['phonecode'] }).exec()
                return resolve('Country updated successfully')
            }
            const _temp = await Country.find().sort({ $natural: -1 }).limit(1)
            const created = await Country.create({
                id: (parseInt(_temp[0]['id']) + 1).toString(),
                name: country['name'],
                sortname: country['sortname'],
                phonecode: country['phonecode'],
            })
            resolve('Country created successfully')
        })
    }

    async remove_country(countries) {
        return new Promise(async (resolve, reject) => {
            try {
                console.log('remove-country:', countries)
                const promises = countries.map(async country => {
                    let deleted = await Country.deleteOne({ _id: country['_id'] }).exec()
                    return deleted
                })
                const deleted = await Promise.all(promises)
                resolve(deleted)
            } catch (error) {
                reject(Error('Please select at least on record'))
            }

        })
    }

    async get_states() {
        return new Promise(async (resolve, reject) => {
            try {
                const _states = await States.find({}).populate('country_id').exec()
                return resolve(_states)
            }
            catch (err) {
                return reject(err)
            }
        })
    }

    async remove_state(states) {
        return new Promise(async (resolve, reject) => {
            try {
                const promises = states.map(async state => {
                    let deleted = await States.deleteOne({ id: state['id'] }).exec()
                    return deleted
                })
                const deleted = await Promise.all(promises)
                resolve(deleted)
            } catch (error) {
                reject(Error('Please select at least on record'))
            }

        })
    }

    async add_state_by_country(state) {
        return new Promise(async (resolve) => {
            const isFind = await States.find({ 'id': state['id'] })
            if (isFind.length) {
                const updated = await States.updateOne({ id: state['id'] }, { name: state['name'], country_id: state['countryId'] }).exec()
                return resolve('State updated successfully')
            }
            const _temp = await States.find().sort({ $natural: -1 }).limit(1)
            const created = await States.create({
                id: (parseInt(_temp[0]['id']) + 1).toString(),
                name: state['name'],
                country_id: state['countryId'],
            })
            resolve('State added successfully')
        })
    }

    async add_city(city) {
        return new Promise(async (resolve, reject) => {
            const isFind = await Cities.find({ '_id': city['_id'] })
            if (isFind.length) {
                const updated = await Cities.updateOne({ _id: city['_id'] }, { name: city['name'], state_id: city['stateId'], country_id: city['countryId'] }).exec()
                return resolve('City updated successfully')
            }
            const _temp = await Cities.find().sort({ $natural: -1 }).limit(1)
            const created = await Cities.create({
                id: (parseInt(_temp[0]['id']) + 1).toString(),
                name: city['name'],
                state_id: city['stateId'],
                country_id: city['countryId'],
            })
            resolve('City added successfully')
        })
    }

    async remove_city(city) {
        return new Promise(async (resolve, reject) => {
            try {
                const cityId = city[0]['_id']
                const deleted = await Cities.findOneAndDelete({ _id: cityId }).exec()
                resolve(deleted)
            }
            catch (err) {
                reject(err)
            }
        })
    }

    async get_states_by_country(countryId) {
        return new Promise(async (resolve, reject) => {
            try {
                const _states = await States.find({ country_id: countryId }).exec()
                return resolve(_states)
            }
            catch (err) {
                return reject(err)
            }
        })
    }

    async get_cities_by_state(stateId, countryId) {
        return new Promise(async (resolve, reject) => {
            try {
                const _cities = await Cities.find({ state_id: stateId, country_id: countryId }).exec()
                return resolve(_cities)
            }
            catch (err) {
                return reject(err)
            }
        })
    }



    async drop_countries() {
        return new Promise(async (resolve, reject) => {
            try {
                await this.db.collection('countries').drop()
                return resolve()
            } catch (error) {
                reject(error)
            }
        })
    }

    async drop_states() {
        return new Promise(async (resolve, reject) => {
            try {
                await this.db.collection('states').drop()
                return resolve()
            } catch (error) {
                reject(error)
            }
        })
    }

    async drop_cities() {
        return new Promise(async (resolve, reject) => {
            try {
                await this.db.collection('cities').drop()
                return resolve()
            } catch (error) {
                reject(error)
            }
        })
    }


}

module.exports = Geolocation
