'use strict';

//App Libraries
const express = require('express');
// cors = Cross Origin resource sharing
const cors = require('cors');
//dotenv (read our enviroment variable)
const dot = require('dotenv');
const { request } = require('http');
const { response } = require('express');
dot.config();


//App setup
const PORT = process.env.PORT || 3030;
const app = express();
app.use(cors());

// Routes Definitions
app.get('/',handlerHomeRoute);
app.get('/location',locationHandler);
app.get('/weather',weatherHandler);
app.get('*',notFoundHandler);
app.use(errorHandler);


// Routes handler
function handlerHomeRoute (request, response) {
    response.status(200).send('you did a great job');
}

function locationHandler (req, res) {
    const city = req.query.city;
    const locData = require('./data/location.json')
    const locationObj = new Location(city, locData);
    res.send(locationObj);
}

function weatherHandler (req, res) {
    const wetherData = require('./data/weather.json');
    let weatherDaily = [];
    wetherData.data.forEach(value => {
        const wetherObj = new Weather(value)
        weatherDaily.push(wetherObj)
    })
    res.send(weatherDaily);
}

function notFoundHandler (req, res) {
    res.status(404).send('Not Found')
}

function errorHandler (error, req, res) {
    // let errObj = {
    //     status : 500 ,
    //     responseText : "Sorry, something went wrong"
    // }
    // res.send(errObj);
    res.status(500).send(error);
}


// Constructor
function Location(city, locData) {
    this.search_query = city;
    this.formatted_query = locData[0].display_name;
    this.latitude = locData[0].lat;
    this.longitude = locData[0].lon;
}
function Weather(day) {
    this.forecast = day.weather.description;
    this.time = day.valid_date;
}    

app.listen(PORT, () => {
    console.log(`app is listening on Port ${PORT}`)
})
