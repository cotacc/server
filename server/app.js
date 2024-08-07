  const express = require('express');
  const app = express();
  const port = process.env.PORT || 5000;
  require('dotenv').config();
  const mongoose = require('mongoose');
  const Authroute = require('./routes/auth');
  const Memoroute = require('./routes/memo');
  const bodyparser = require('body-parser');
  const morgan = require('morgan');
  const cors = require('cors');
  const cookieparser = require('cookie-parser');
  const errorhandler = require('./middleware/error');
  const path = require('path');

  mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
    .then((result) => {
      app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
      });
    })
    .catch((err) => {
      console.log(err);
    });

  app.get('/', (req, res) => {
    res.send('Hello, World!');
  });

  // MIDDLEWARE
  app.use(morgan('dev'));
  app.use(bodyparser.json());
  app.use(cookieparser());
  app.use(cors());

  // Serve static files
  app.use('/typememo', express.static('typememo'));

  // ROUTES MIDDLEWARE
  app.use("/api", Authroute);
  app.use('/api', Memoroute);

  // ERRORHANDLER MIDDLEWARE
  app.use(errorhandler);
