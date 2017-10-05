const bcrypt = require( 'bcrypt' );
const bodyParser = require( 'body-parser' );
const cookieParser = require( 'cookie-parser' );
const express = require( 'express' );
const app = express( );
const expressSession = require( 'express-session' );
const LocalStrategy = require( 'passport-local' ).Strategy;
const passport = require( 'passport' );
const sanitizeHtml = require('sanitize-html');
const { Pool } = require( 'pg' );

const connectionString = process.env.DATABASE_URL || 'postgresql://James:@localhost:5432/James'
const pool = new Pool ({
  connectionString: connectionString
})

let click;

app.set('view engine', 'ejs')
app.set('views', `${__dirname}/views/`)

app.use(express.static( 'public' ));
app.use(cookieParser());
app.use(expressSession({ secret: 'x' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
  click = req.session.clicks;
  req.session.clicks++
  next()
});

passport.use(new LocalStrategy((username, password, done) => {
  pool.query('select username, hashedpw from users where username = $1',[username],(err,user) => {
    if ( user.rows.length == 0 ){
      done(null, false, {error: 'no user'})
    } else {
      bcrypt.compare( password, user.rows[0].hashedpw, (err, result) => {
        if(!result){
          done( null, false, {error:'bad pw'} )
        } else {
          done( null, user.rows[0] )
        }
      })
    }
  })
}))

passport.serializeUser((user, done) => {
  done(null, user)
})

passport.deserializeUser((user, done) => {
  //console.log(user)
})

app.get('/', (req, res) => {
  var ip = req.headers['x-forwarded-for'] ||
     req.connection.remoteAddress ||
     req.socket.remoteAddress ||
     req.connection.socket.remoteAddress;
  pool.query('select * from hits', (err, hits) => {
    const hit = hits.rows[0].hits;
    res.render('index',{
      hits: hit
    });
  })
  pool.query('update hits set hits = hits+1');
})

app.get('/news',(req, res) => {
  const min = 0;
  const max = min + 5;
  pool.query('select * from news order by id desc', (err, news) => {
    if (err){
      console.log(err)
    }

    const filteredNews = news.rows.map((entry, index) => {
      return {index, author: entry.author, content:entry.content, date:entry.date}
    }).filter(entry => {
      return entry.index >= min && entry.index < max
    })

    res.render('news', {
      title: 'News',
      news: filteredNews,
      currentPage: 0,
      nextPage: 1,
      previousPage: null,
      totalEntries: news.rows.length,
      clicks: click
    });
  })
})

app.get('/news/:id',(req, res) => {
  const min = req.params.id*5;
  const max = min + 5;
  pool.query('select * from news order by id desc', (err, news) => {
    if (err){
      console.log(err)
    }

    const filteredNews = news.rows.map((entry, index) => {
      return {index, author: entry.author, content:entry.content, date:entry.date}
    }).filter(entry => {
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
      clicks: click
    });
  })
})

app.get('/guestbook', (req,res) => {
  const min = 0;
  const max = 10;

  pool.query('select * from guestbook order by id desc', (err, data) => {
    if (err){
      console.log(err)
    }

    const filteredComments = data.rows.map((entry, index) => {
      return {index, author: entry.author, content: entry.content, date: entry.date}
    }).filter(entry => {
      return entry.index >= min && entry.index < max
    })

    res.render('guestbook',{
      title: 'GUESTBOOK',
      data: filteredComments,
      currentPage: 0,
      nextPage: 1,
      previousPage: null,
      totalEntries: data.rows.length,
      clicks: click
    })
  })
})

app.get('/guestbook/:id', (req,res) => {
  const min = req.params.id * 10;
  const max = min + 10;

  pool.query('select * from guestbook order by id desc', (err, data) => {
    if (err){
      console.log(err)
    }

    const filteredComments = data.rows.map((entry, index) => {
      return {index, author: entry.author, content: entry.content, date: entry.date, id: entry.id}
    }).filter(entry => {
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
      clicks: click
    })
  })
})

app.post('/postComment', (req, res) => {
  var ip = req.headers['x-forwarded-for'] ||
     req.connection.remoteAddress ||
     req.socket.remoteAddress ||
     req.connection.socket.remoteAddress;

  var commentCheck = new RegExp('.*(<script|</html).*');
  if (commentCheck.test(req.body.content)){
    res.redirect('http://www.tacospin.com');
  }
  pool.query('insert into guestbook (author, content, ip) values ($1, $2, $3)', [req.body.author, sanitizeHtml(req.body.content), ip], (err, comment) => {
    if (err){
      console.log(err)
    }
    res.redirect('/guestbook')
  })
})

app.get('/shows', (req, res) => {
  pool.query('select * from shows where date + 2 >= now() order by date asc', (err, shows) => {
    if (err){
      console.log(err)
    }
    res.render('shows', {
      title: 'Shows',
      shows: shows.rows,
      clicks: click
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
      shows: shows.rows,
      clicks: click
    })
  })
});

app.get('/store', (req, res) => {
  res.render('store', {
    title: 'Store',
    clicks: click
  })
})

app.get('/about', (req, res) => {
  res.render('about', {
    title: `Jubert's Secret Blog`,
    clicks: click
  })
})

app.get('/releases', (req, res) => {
  pool.query('select * from releases order by year desc, name desc', (err, releases) => {
    if (err){
      console.log(err)
    }
    res.render('releases', {
      title: `Releases & Discography`,
      data: releases.rows,
      clicks: click
    })
  })

})

app.get('/releases/:id', (req, res) => {
  console.log(click);
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
        for (let char of tracks) {
          if (char != ','){
            bucket += char;
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
        clicks: click
      })
    })
  })
})

app.get('/admin', (req,res) => {
  res.render('login');
})

app.post('/dashboard', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      return res.redirect('http://www.tacospin.com');
    }

    req.logIn(user, (err) => {
      if (err){
        return next(err);
      }
      return res.render('dashboard');
    })
  })(req, res, next);
})

app.get('/supersecretpage', (req, res) => {
  var errMsg = '';
  if( req.query.err ){
    errMsg = 'that username is already taken, dingus!';
  }
  res.render('secret',{
    errz:errMsg
  });
})

app.post('/newUser', (req, res) => {
  pool.query('select * from users where username=$1',[req.body.username],(err, joint) => {
    if( joint.rows.length != 0 ){
      res.redirect('/supersecretpage?err=1')
    } else {
      bcrypt.hash(req.body.password, 10, (err, hash) =>{
        pool.query('insert into users (username, hashedpw) values ($1, $2)',[req.body.username, hash], (err, joint) => {
          if (err){
            console.log(err)
          }
          res.render('login')
        })
      })
    }
  })
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
