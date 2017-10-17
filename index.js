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

const connectionString = process.env.DATABASE_URL || 'postgresql://James:@localhost:5432/James';
const pool = new Pool ({
  connectionString: connectionString
});

let click;

app.set('view engine', 'ejs');
app.set('views', `${__dirname}/views/`);

app.use(express.static( 'public' ));
app.use(cookieParser());
app.use(expressSession({ secret: 'x' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
  click = req.session.clicks;
  req.session.clicks++;
  next();
});

app.use((req, res, next) => {
  var ip = req.headers['x-forwarded-for'] ||
     req.connection.remoteAddress ||
     req.socket.remoteAddress ||
     req.connection.socket.remoteAddress;
  if (ip.toString() == '38.88.33.66'){
    res.redirect('http://www.tacospin.com')
  }
  next();
})

passport.use(new LocalStrategy( async (username, password, done) => {
  try {
    const user = await pool.query('select username, hashedpw from users where username = $1',[username])
    if ( user.rows.length == 0 ){
      done(null, false, {error: 'no user'});
    } else {
      bcrypt.compare( password, user.rows[0].hashedpw, (err, result) => {
        if( !result ){
          done( null, false, {error:'bad pw'} );
        } else {
          done( null, user.rows[0] );
        }
      });
    }
  } catch (err) {
    console.log(err)
  }
}));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

app.get('/', async (req, res) => {
  try {
    const { rows: [{ hits }] } = await pool.query('select * from hits')
    res.render('index',{
      hits
    });
    await pool.query('update hits set hits = hits+1')
  } catch (err) {
    console.log(err)
  }
});

app.get('/news', async (req, res) => {
  const min = 0;
  const max = min + 5;
  try {
    const news = await pool.query('select * from news order by id desc')

    const filteredNews = news.rows.map((entry , index) => {
      return {index, author: entry .author, content:entry .content, date:entry .date};
    }).filter(entry => {
      return entry .index >= min && entry .index < max;
    });

    res.render('news', {
      title: 'News',
      news: filteredNews,
      currentPage: 0,
      nextPage: 1,
      previousPage: null,
      totalEntries: news.rows.length,
      clicks: click
    });
  } catch (err) {
    console.log(err)
  }

});

app.get('/news/:id', async (req, res) => {
  const min = req.params.id*5;
  const max = min + 5;
  try {
    const news = await pool.query('select * from news order by id desc')
    const filteredNews = news.rows.map((entry , index) => {
      return {index, author: entry .author, content:entry .content, date:entry .date};
    }).filter(entry => {
      return entry .index >= min && entry .index < max;
    });

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
  } catch (err){
    console.log(err)
  }
});

app.get('/guestbook', async (req,res) => {
  const min = 0;
  const max = 10;
  try {
    const data = await pool.query('select * from guestbook order by id desc')
    const filteredComments = data.rows.map((entry , index) => {
      return {index, author: entry .author, content: entry .content, date: entry .date};
    }).filter(entry => {
      return entry .index >= min && entry .index < max;
    });

    res.render('guestbook',{
      title: 'GUESTBOOK',
      data: filteredComments,
      currentPage: 0,
      nextPage: 1,
      previousPage: null,
      totalEntries: data.rows.length,
      clicks: click
    });
  } catch (err) {
    console.log(err)
  }
});

app.get('/guestbook/:id', async (req,res) => {
  const min = req.params.id * 10;
  const max = min + 10;
  try {
    const data = await pool.query('select * from guestbook order by id desc')
    const filteredComments = data.rows.map((entry , index) => {
      return {index, author: entry .author, content: entry .content, date: entry .date, id: entry .id};
    }).filter(entry => {
      return entry .index >= min && entry .index < max;
    });

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
    });
  } catch (err) {
    console.log(err)
  }
});

app.post('/postComment', async (req, res) => {
  var ip = req.headers['x-forwarded-for'] ||
     req.connection.remoteAddress ||
     req.socket.remoteAddress ||
     req.connection.socket.remoteAddress;

  var commentCheck = new RegExp('.*(<script|</html).*');
  if (commentCheck.test(req.body.content)){
    res.redirect('http://www.tacospin.com');
  }
  try {
    await pool.query('insert into guestbook (author, content, ip) values ($1, $2, $3)', [req.body.author, sanitizeHtml(req.body.content), ip])
    console.log(`${req.body.author} posted from ${ip} : ${req.body.content}`)
    res.redirect('/guestbook');
  } catch (err){
    console.log(err)
  }
});

app.get('/shows', async (req, res) => {
  try {
    const shows = await pool.query('select * from shows where date + 2 >= now() order by date asc')
    res.render('shows', {
      title: 'Shows',
      shows: shows.rows,
      clicks: click
    });
  } catch (err) {
    console.log(err)
  }
});

app.get('/showarchive', async (req, res) => {
  try {
    const shows = await pool.query('select * from shows order by date desc')
    res.render('showarchive', {
      title: 'Show Archive',
      shows: shows.rows,
      clicks: click
    });
  } catch (err) {
    console.log(err)
  }
});

app.get('/store', (req, res) => {
  res.render('store', {
    title: 'Store',
    clicks: click
  });
});

app.get('/about', (req, res) => {
  res.render('about', {
    title: 'Jubert\'s Secret Blog',
    clicks: click
  });
});

app.get('/releases', async (req, res) => {
  try {
    const releases = await pool.query('select * from releases order by year desc, name desc')
    res.render('releases', {
      title: 'Releases & Discography',
      data: releases.rows,
      clicks: click
    });
  } catch (err) {
    console.log(err)
  }
});

app.get('/releases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const release = await pool.query('select * from releases where id=$1',[id])
    const [{  meta, name, year, story,
              label, format, recorded,
              mastered, imgsrc, tracklist: unparsedTracklist = []
          }] = release.rows
    const others = await pool.query('select * from releases where meta=$1 and id!=$2',[meta, id])

    const listOfOthers = others.rows.map(other => {
      return { name:other.name, id:other.id };
    });

    const parsedTracklist = unparsedTracklist.split(',')

    res.render('release', {
      title: name,
      meta, name, year, story, label, format, recorded, mastered, imgsrc,
      tracklist: parsedTracklist,
      otherVersions: listOfOthers,
      clicks: click
    });

  } catch (err) {
    console.log(err)
  }


})

app.get('/admin', (req,res) => {
  res.render('login');
});

app.post('/dashboard', (req, res, next) => {
  passport.authenticate('local', (err, user) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      return res.redirect('http://www.tacospin.com');
    }

    req.logIn(user, async (err) => {
      if (err){
        return next(err);
      }
      try {
        const dummyresult = await pool.query('select hashedpw from users where username = $1', ['dummyplaintext'])
        bcrypt.compare(dummyresult.rows[0].hashedpw, req.session.passport.user.hashedpw, (err, result) => {
          if (result){
            res.render('changepw', {
              user: user
            });
          } else {
            res.render('dashboard', {
              user: user
            });
          }
        });
      } catch (err) {
        console.log(err)
      }
    });
  })(req, res, next);
});

app.post('/resetPW', (req, res) => {
  const user = req.session.passport.user.username;
  bcrypt.hash(req.body.password, 10, async (err, hash) => {
    try {
    await pool.query('update users set hashedpw = $1 where username = $2', [hash, user])
    res.redirect('/admin');
    } catch (err){
      console.log(err)
    };
  })
})

app.post('/postNews', async (req, res) => {
  try {
    await pool.query('insert into news (author, content) values ($1, $2)',[req.body.author, req.body.content])
    res.render('dashboard',{
      user: req.session.passport.user
    });
  } catch (err) {
    console.log(err)
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log(`Your app is listening on port ${listener.address().port}`);
});

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  next();
});
