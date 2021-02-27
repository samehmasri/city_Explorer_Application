'use strict';
const express = require ('express');
require('dotenv').config();

const cors = require('cors');
const pg =require('pg');


const server = express();
server.use(cors());

const superAgent0 =require('superagent');
const PORT = process.env.PORT || 3030;
// const client = new pg.Client(process.env.DATABASE_URL);

const client = new pg.Client({ connectionString: process.env.DATABASE_URL,   ssl: { rejectUnauthorized: false } });


// Route definition
server.get('/', handlerHomeRoute);
server.get('/location', locationHandler);
server.get('/weather', weatherHandler );
server.get('/parks', parkHandler );

server.use('*', notFoundRoute );
server.use(errorHandler);


// constructor
function Location (city , locationData) {
  this.search_query = city;
  this.formatted_query= locationData.display_name;
  this.latitude = locationData.lat;
  this.longitude = locationData.lon;
}


function Weather (WeatherData) {
  this.forecast = WeatherData.weather.description ;
  this.time = WeatherData.datetime;
}

function Park (parkData) {
  this.name = parkData.name ;
  this.address = parkData.address;
  this.fee = parkData.fee;
  this.description = parkData.description;
  this.url = parkData.url;
}

// function
function handlerHomeRoute (request,response){
  response.send('go to home');
}

function locationHandler(request,response){
  const cityName = request.query.city;

  let SQL = 'SELECT search_query FROM locations;';
  let sqlV = [];
  let allCity = [];

  client.query(SQL).then(results => {
    console.log(results.rows);
    sqlV = results.rows;
    allCity = sqlV.map(element => {
      return element.search_query;
    });

    if (!allCity.includes(cityName)) {
      let key = process.env.LocationKey;
      let url = `https://eu1.locationiq.com/v1/search.php?key=${key}&q=${cityName}&format=json`;

      superAgent0.get(url).then(locData => {
        const locationObj = new Location(cityName, locData.body[0]);
        let SQL = 'INSERT INTO locations VALUES ($1,$2,$3,$4) RETURNING *;';
        let safeValues = [location.search_query, location.formatted_query, location.latitude, location.longitude];

        client.query(SQL, safeValues)
          .then((result) => {
            response.send(result.rows);
          });

        console.log('from API');
        response.send(locationObj);
      }).catch(()=>{
        errorHandler('error in getting data from Api server ',request,response);
      });
    } else {
      let SQL = `SELECT * FROM locations WHERE search_query = '${cityName}';`;
      client.query(SQL)
        .then(result=>{
          console.log('from dataBase');
          response.send(result.rows[0]);
        });
    }
  });
}

function weatherHandler(request,response){
  let WeatherKey = process.env.WeatherKey;
  const cityWeatherName = request.query.search_query;

  // https://api.weatherbit.io/v2.0/forecast/daily?city=amman&key=01e6b09a24b640dd9610c10e0045bb58
  let url = `https://api.weatherbit.io/v2.0/forecast/daily?city=${cityWeatherName}&key=${WeatherKey}`;

  superAgent0.get(url).then(weatherData =>{
    let weatherDataMap = weatherData.body.data.map(element => {
      const weatherObject = new Weather(element);
      return weatherObject;
    });
    response.send(weatherDataMap);
  }).catch(()=>{
    errorHandler('error in getting data from Api server ',request,response);
  });
}

function parkHandler(request,response){
  let parkKey = process.env.parkKey;
  const cityName = request.query.search_query;

  // const parkCode = request.query.parkCode;

  //https://developer.nps.gov/api/v1/parks?parkCode=acad&api_key=lUQX63yCYlb0s2d3kx5hAwScVfNNM4E4ZLNOYbYX

  // let url = `https://developer.nps.gov/api/v1/parks?parkCode=${parkCode}&api_key=${parkKey}`;
  let url = `https://developer.nps.gov/api/v1/parks?q=${cityName}&api_key=${parkKey}&limit=1`;

  superAgent0.get(url).then(parkData =>{
    // console.log(parkData);
    let parkData0 = parkData.body.data.map(element => {
      const parkObject = new Park(element);
      return parkObject;
    });
    response.send(parkData0);
  }).catch(()=>{
    errorHandler('error in getting data from Api server ',request,response);
  });
}

function notFoundRoute(req,res){
  res.status(404).send('Error message // The Route not found');
}

function errorHandler(error,req,res){
  res.status(500).send(error);
}


client.connect().then(()=>{
  server.listen(PORT, ()=>{
    console.log(`Listening on PORT ${PORT}`);

  });

});