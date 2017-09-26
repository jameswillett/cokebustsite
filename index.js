const express = require("express");
const app = express();

const bodyParser = require("body-parser");
const jsonParser = bodyParser.json();

const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://James:@localhose:5432/James'

const pool = new Pool ({
  connectionString: connectionString
})

app.set('view engine', 'ejs')
app.set('views', `${__dirname}/views/`)

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.render('index');
})

app.get('/news',(req, res) => {
  const min = 0;
  const max = min + 5;
  pool.query('select * from news order by id desc', (err, news) => {
    if (err){
      console.log(err)
    }

    var indexedNews = news.rows.map((entry, index) => {
      return {index, author: entry.author, content:entry.content, date:entry.date}
    })

    var filteredNews = indexedNews.filter(entry => {
      return entry.index >= min && entry.index < max
    })

    res.render('news', {
      title: 'News',
      news: filteredNews,
      currentPage: 0,
      nextPage: 1,
      previousPage: null,
      totalEntries: news.rows.length
    });
  })
})

app.get('/news/:id',(req, res) => {
  const min = req.params.id*5;
  const max = min + 5;
  pool.query('select * from news order by date, id desc', (err, news) => {
    if (err){
      console.log(err)
    }
    var indexedNews = news.rows.map((entry, index) => {
      return {index, author: entry.author, content:entry.content, date:entry.date}
    })

    var filteredNews = indexedNews.filter(entry => {
      return entry.index >= min && entry.index < max
    })

    var prev = parseInt(req.params.id)-1;
    if (prev==0){
      prev=null;
    }

    res.render('news', {
      title: 'News',
      news: filteredNews,
      previousPage: prev,
      currentPage: parseInt(req.params.id),
      nextPage: parseInt(req.params.id)+1,
      totalEntries: news.rows.length
    });
  })
})

app.get('/shows', (req, res) => {
  pool.query('select * from shows where date + 2 >= now() order by date asc', (err, shows) => {
    if (err){
      console.log(err)
    }
    res.render('shows', {
      title: 'Shows',
      shows: shows.rows
    })
  })
});

app.get('/showarchive', (req, res) => {
  pool.query('select * from shows order by date desc', (err, shows) => {
    if (err){
      console.log(err)
    }
    res.render('showarchive', {
      title: 'Show Archive',
      shows: shows.rows
    })
  })
});

app.get('/store', (req, res) => {
  res.render('store', {
    title: 'Store'
  })
})

app.get('/getProducts', (req, res) => {
  pool.query('select * from products', (err, products) => {
    if (err){
      console.log(err)
    }
    res.json(products.rows)
  })
})

app.get('/about', (req, res) => {
  res.render('about', {
    title: `Jubert's Secret Blog`
  })
})

app.get('/releases', (req, res) => {
  pool.query('select * from releases order by year desc, name desc', (err, releases) => {
    if (err){
      console.log(err)
    }
    res.render('releases', {
      title: `Releases & Discography`,
      data: releases.rows
    })
  })

})

app.get('/releases/:id', (req, res) => {
  const id = req.params.id;
  pool.query('select * from releases where id=$1',[id], (err, release) => {
    if (err){
      console.log(err)
    }
    const selected = release.rows[0];
    pool.query(`select * from releases where meta=$1 and id!=$2`,[selected.meta, selected.id], (err2, others) => {
      if (err2){
        console.log(err2)
      }
      var listOfOthers = [];
      others.rows.map(other => {
        listOfOthers.push({name:other.name,id:other.id})
      })

      const parseTracklist = (tracks) => {
        var parsed = [];
        var bucket = '';
        for (var i = 0; i < tracks.length; i++){
          if (tracks[i] != ','){
            bucket += tracks[i];
          } else {
            parsed.push(String(bucket));
            bucket = '';
          }
        }
        parsed.push(String(bucket));
        return parsed;
      }

      if (selected.tracklist){
        selected.tracklist = parseTracklist(selected.tracklist)
      } else {
        selected.tracklist = [];
      }

      res.render('release', {
        title: selected.name,
        year: selected.year,
        name: selected.name,
        imgsrc: `/${selected.imgsrc}`,
        otherVersions: listOfOthers,
        tracklist: selected.tracklist
      })
    })
  })
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log(`Your app is listening on port ${listener.address().port}`);
});

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});
