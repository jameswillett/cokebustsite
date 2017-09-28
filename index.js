const express = require("express");
const app = express();

const md5 = require('md5');

const passport = require('passport');

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));

const jsonParser = bodyParser.json();

const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://James:@localhost:5432/James'

const pool = new Pool ({
  connectionString: connectionString
})

const hashed = '8ba3c1c2ef2db1de81f6fcbdca54c3e0';
var clicks = 0;


app.set('view engine', 'ejs')
app.set('views', `${__dirname}/views/`)

app.use(express.static('public'));

app.get('/', (req, res) => {
  pool.query('select * from hits', (err, hits) => {
    const hit = hits.rows[0].hits;
    res.render('index',{
      hits: hit
    });
  })
  pool.query('update hits set hits = hits+1');
})

app.get('/news',(req, res) => {
  clicks++;
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
      totalEntries: news.rows.length,
      clicks: clicks
    });
  })
})

app.get('/news/:id',(req, res) => {
  clicks++;
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
      totalEntries: news.rows.length,
      clicks: clicks
    });
  })
})

app.get('/guestbook', (req,res) => {
  clicks++;
  const min = 0;
  const max = 10;

  pool.query('select * from guestbook order by id desc', (err, data) => {
    if (err){
      console.log(err)
    }

    var indexedComments = data.rows.map((entry, index) => {
      return {index, author: entry.author, content: entry.content, date: entry.date}
    })

    var filteredComments = indexedComments.filter(entry => {
      return entry.index >= min && entry.index < max
    })

    res.render('guestbook',{
      title: 'GUESTBOOK',
      data: filteredComments,
      currentPage: 0,
      nextPage: 1,
      previousPage: null,
      totalEntries: data.rows.length,
      clicks: clicks
    })
  })
})

app.get('/guestbook/:id', (req,res) => {
  clicks++;
  const min = req.params.id * 10;
  const max = min + 10;

  pool.query('select * from guestbook order by id desc', (err, data) => {
    if (err){
      console.log(err)
    }

    var indexedComments = data.rows.map((entry, index) => {
      return {index, author: entry.author, content:entry.content, date:entry.date}
    })

    var filteredComments = indexedComments.filter(entry => {
      return entry.index >= min && entry.index < max
    })

    var prev = parseInt(req.params.id)-1;
    if (prev==0){
      prev=null;
    }

    res.render('guestbook',{
      title: 'GUESTBOOK',
      data: filteredComments,
      currentPage: parseInt(req.params.id),
      nextPage: parseInt(req.params.id)+1,
      previousPage: prev,
      totalEntries: data.rows.length,
      clicks: clicks
    })
  })
})

app.post('/postComment', (req, res) => {
  pool.query('insert into guestbook (author, content) values ($1, $2)',[req.body.author, req.body.content], (err, comment) => {
    if (err){
      console.log(err)
    }
    res.redirect('/guestbook')
  })
})

app.get('/shows', (req, res) => {
  clicks++;
  pool.query('select * from shows where date + 2 >= now() order by date asc', (err, shows) => {
    if (err){
      console.log(err)
    }
    res.render('shows', {
      title: 'Shows',
      shows: shows.rows,
      clicks: clicks
    })
  })
});

app.get('/showarchive', (req, res) => {
  clicks++;
  pool.query('select * from shows order by date desc', (err, shows) => {
    if (err){
      console.log(err)
    }
    res.render('showarchive', {
      title: 'Show Archive',
      shows: shows.rows,
      clicks: clicks
    })
  })
});

app.get('/store', (req, res) => {
  clicks++;
  res.render('store', {
    title: 'Store',
    clicks: clicks
  })
})

app.get('/about', (req, res) => {
  clicks++;
  res.render('about', {
    title: `Jubert's Secret Blog`,
    clicks: clicks
  })
})

app.get('/releases', (req, res) => {
  clicks++;
  pool.query('select * from releases order by year desc, name desc', (err, releases) => {
    if (err){
      console.log(err)
    }
    res.render('releases', {
      title: `Releases & Discography`,
      data: releases.rows,
      clicks: clicks
    })
  })

})

app.get('/releases/:id', (req, res) => {
  clicks++;
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
        tracklist: selected.tracklist,
        clicks: clicks
      })
    })
  })
})

app.get('/admin', (req,res) => {
  res.render('login');
})

app.post('/dashboard', (req,res) => {
  if( md5(req.body.password) == hashed ){
    res.render('dashboard')
  } else {
    res.redirect('http://tacospin.com')
  }
})

app.post('/postNews', (req,res) => {
  pool.query('insert into news (author, content) values ($1, $2)',[req.body.author, req.body.content], (err, news) => {
    if (err){
      console.log(err)
    }
    res.render('dashboard')
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
