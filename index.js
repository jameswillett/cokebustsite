const express = require("express");
const app = express();

const bodyParser = require("body-parser");
const jsonParser = bodyParser.json();

const { Pool } = require('pg');

const pool = new Pool({
  user: 'James',
  host: 'localhost',
  database: 'James'
})

app.set('view engine', 'ejs')
app.set('views', `${__dirname}/views/`)

app.use(express.static('public'));



app.get('/', (req, res) => {
  res.render('index');
})

app.get('/news',(req, res) => {
  res.render('news', {
    title: 'News'
  });
})

app.get('/getNews', (req, res) => {
  pool.query('select * from news order by date, id desc', (err, news) => {
    if (err){
      console.log(err)
    }
    res.json(news.rows)
  })
});

app.get('/shows', (req, res) => {
    res.render('shows', {
      title: 'Shows'
    })
  })

app.get('/getFutureShows', (req, res) => {
  pool.query('select * from shows where date > now() order by date desc', (err, shows) => {
    if (err){
      console.log(err)
    }
    res.json(shows.rows)
  })
});

app.get('/showarchive', (req, res) => {
    res.render('showarchive', {
      title: 'Show Archive'
    })
  })

app.get('/getAllShows', (req, res) => {
  pool.query('select * from shows order by date asc', (err, shows) => {
    if (err){
      console.log(err)
    }
    res.json(shows.rows)
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
  res.render('releases', {
    title: `Releases & Discography`
  })
})

app.get('/getReleases', (req, res) => {
  pool.query('select * from releases order by year desc, name desc', (err, releases) => {
    if (err){
      console.log(err)
    }
    res.json(releases.rows)
  })
})

app.use((req, res, next) => {
  res.locals.title = null;
  res.locals.year = null
  res.locals.name = null;
  res.locals.label = null;
  res.locals.format = null;
  res.locals.recorded = null;
  res.locals.mastered = null;
  res.locals.story = null;
  next();
})

app.get('/getRelease', jsonParser, (req, res) => {
  pool.query('select * from releases where id=$1',[req.query.id], (err, release) => {
    const selected = release.rows[0];
    if (!selected.imgsrc){
      selected.imgsrc = 'jubert404.jpg'
    }

    res.render('release', {
      title: selected.name + '',
      year: selected.year,
      name: selected.name + '',
      label: selected.label + '',
      format: selected.format + '',
      recorded: selected.recorded + '',
      mastered: selected.mastered + '',
      story: selected.story + '',
      imgsrc: selected.imgsrc + '',
      otherVersions: selected.other_versions + '',
      tracklist: selected.tracklist + ''
    })
  })
});

app.post('/getOtherVersions', jsonParser, (req, res) => {
  var quer = '';
  req.body.map((jawn,index) => {
    quer += jawn;
    if(index<req.body.length-1){
      quer+=','
    }
  })

  pool.query(`select * from releases where id in (${quer})`, (err, releases) => {
    var listOfJoints = [];
    releases.rows.map(joint => {
      listOfJoints.push({name:joint.name,id:joint.id})
    })
    res.json(listOfJoints);
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
