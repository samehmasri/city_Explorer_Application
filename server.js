'use strict';

//App Libraries
const express = require('express');
// cors = Cross Origin resource sharing
const cors = require('cors');
//dotenv (read our enviroment variable)
const dot = require('dotenv');
dot.config();
const { request } = require('http');
const { response } = require('express');
const superAgent0 = require('superagent');
const pg = require('pg');

//App setup
const PORT = process.env.PORT || 3000;


const app = express();
app.use(cors());

const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// Routes Definitions
app.get('/', handlerHomeRoute);
app.get('/location', locationHandler);
app.get('/weather', weatherHandler);
app.get('/parks', parkHandler);
app.get('/movies', movieHandler);
app.get('/yelp', yelpHandler );
app.get('*', notFoundHandler);
app.use(errorHandler);


// Routes handler
function handlerHomeRoute(request, response) {
  response.status(200).send('you did a great job');
}

// function locationHandler(request, response) {
//     const cityName = request.query.city;
//     let LocationKey = process.env.LocationKey;
//     let url = `https://eu1.locationiq.com/v1/search.php?key=${LocationKey}&q=${cityName}&format=json`;

//     superAgent0.get(url).then(locData => {
//         const locationObj = new Location(cityName, locData.body);
//         response.send(locationObj);
//     }).catch(() => {
//         errorHandler('error in getting data from Api server ', request, response);
//     });
// }
function locationHandler(request, response) {
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
      let LocationKey = process.env.LocationKey;
      let url = `https://eu1.locationiq.com/v1/search.php?key=${LocationKey}&q=${cityName}&format=json`;

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
      }).catch(() => {
        errorHandler('error in getting data from Api server ', request, response);
      });
    } else {
      let SQL = `SELECT * FROM locations WHERE search_query = '${cityName}';`;
      client.query(SQL)
        .then(result => {
          console.log('from dataBase');
          response.send(result.rows[0]);
        });
    }
  });
}


function weatherHandler(request, response) {
  let WeatherKey = process.env.WeatherKey;
  const cityWeatherName = request.query.search_query;
  let url = `https://api.weatherbit.io/v2.0/forecast/daily?city=${cityWeatherName}&key=${WeatherKey}`;

  superAgent0.get(url).then(weatherData => {
    let weatherDataMap = weatherData.body.data.map(element => {
      const weatherObject = new Weather(element);
      return weatherObject;
    });
    response.send(weatherDataMap);
  }).catch(() => {
    errorHandler('error in getting data from Api server ', request, response);
  });
}

// //https://developer.nps.gov/api/v1/parks?parkCode=acad&api_key=qX5gcRGkHDobON1AycnsAX5Us2QPWjfUpCQN54lW
// function parkHandler(request,response){
//     let parkKey = process.env.parkKey;
//     const latitude = request.query.latitude;
//     const longitude = request.query.longitude;
//     let url = `https://developer.nps.gov/api/v1/parks?latitude=${latitude}&longitude=${longitude}&api_key=${parkKey}`;

//   superAgent0.get(url).then(parkData =>{

//     let parkData0 = parkData.body.data.map(element => {
//       const parkObject = new Park(element);
//       return parkObject;
//     });
//     response.send(parkData0);
//   }).catch(()=>{
//     errorHandler('error in getting data from Api server ',request,response);
//   });
// }

function parkHandler(request, response) {
  let parkKey = process.env.parkKey;
  const cityName = request.query.search_query;

  // let url = `https://developer.nps.gov/api/v1/parks?parkCode=${parkCode}&api_key=${parkKey}`;
  let url = `https://developer.nps.gov/api/v1/parks?q=${cityName}&api_key=${parkKey}&limit=1`;

  superAgent0.get(url).then(parkData => {
    // console.log(parkData);
    let parkData0 = parkData.body.data.map(element => {
      const parkObject = new Park(element);
      return parkObject;
    });
    response.send(parkData0);
  }).catch(() => {
    errorHandler('error in getting data from Api server ', request, response);
  });
}
// Access token : eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJkNTQ0NDkyMGEzYzIxYTE2OGRhMDRlZjBmYTViYTAwMSIsInN1YiI6IjYwM2I1ODE3YTJlNjAyMDA0YmY0YzY2OCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.LnYORM7kBhWdsz98DWORriIMVmwkm3Z990ulsIP1tU4
// https://api.themoviedb.org/3/movie/550?api_key=d5444920a3c21a168da04ef0fa5ba001
function movieHandler(request, response) {
  const cityName = request.query.search_query;
  let movieKey = process.env.movieKey;

  let url = `https://api.themoviedb.org/3/search/movie?api_key=${movieKey}&query=${cityName}&language=de-DE&region=DE`;
  let movies = [];

  superAgent0.get(url).then(movieData => {
    movies = movieData.body.results.map(element => {
      const movieObject = new Movie(element);
      return movieObject;
    });
    response.send(movies);
  });
}

function yelpHandler(request,response){
  const cityName = request.query.search_query;
  const page = request.query.page;
  let yelpKey = process.env.yelpKey ;
  const pageNumber = 5;
  const startIndex = ((page -1) * pageNumber +1);

  let url = `https://api.yelp.com/v3/businesses/search?location=${cityName}&limit=${pageNumber}&offset=${startIndex}`;

  let yelps = [];
  superAgent0.get(url).set('Authorization', `Bearer ${yelpKey}`)
    .then(yelpData =>{

      yelps = yelpData.body.businesses.map(element => {
        const yelpObject = new Yelp(element);
        return yelpObject;
      });
      response.send(yelps);
    });
}

function notFoundHandler(req, res) {
  res.status(404).send('Not Found')
}

function errorHandler(error, req, res) {

  res.status(500).send(error);
}


// Constructor
function Location(city, locData) {
  this.search_query = city;
  this.formatted_query = locData[0].display_name;
  this.latitude = locData[0].lat;
  this.longitude = locData[0].lon;
}

function Weather(weatherDay) {
  this.forecast = weatherDay.weather.description;
  this.time = weatherDay.datetime;
}

function Park(parkData) {
  this.name = parkData.name;
  this.address = parkData.address;
  this.fee = parkData.fee;
  this.description = parkData.description;
  this.url = parkData.url;
}

function Movie(movieData) {
  this.title = movieData.title;
  this.overview = movieData.overview;
  this.average_votes = movieData;
  this.total_votes = movieData.vote_count;
  this.image_url = `https://image.tmdb.org/t/p/w500${movieData.poster_path}`;
  this.popularity = movieData.popularity;
  this.released_on = movieData.popularity;
}

function Yelp (yelpData){
  this.name = yelpData.name;
  this.image_url = yelpData.image_url;
  this.price = yelpData.price;
  this.rating = yelpData.rating;
  this.url = yelpData.url;
}

app.listen(PORT, () => {
  console.log(`app is listening on Port ${PORT}`)
})
