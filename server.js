const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');
const dns = require('dns');
const urlParser = require('url');
const Url = require('./models/Url');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('views'));

// الاتصال بقاعدة البيانات
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ DB Connection Error:", err));

// HTML form
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// API endpoint - Shorten URL
let count = 1;

app.post('/api/shorturl', (req, res) => {
  const { url } = req.body;

  // التحقق الأول: لازم يبدأ بـ http:// أو https://
  if (!/^https?:\/\/.+/.test(url)) {
    return res.json({ error: 'invalid url' });
  }

  const hostname = urlParser.parse(url).hostname;

  dns.lookup(hostname, async (err) => {
    if (err) return res.json({ error: 'invalid url' });

    const found = await Url.findOne({ original_url: url });
    if (found) {
      return res.json({ original_url: found.original_url, short_url: found.short_url });
    }

    const newUrl = new Url({ original_url: url, short_url: count++ });
    await newUrl.save();

    res.json({ original_url: newUrl.original_url, short_url: newUrl.short_url });
  });
});




// API endpoint - Redirect
app.get('/api/shorturl/:short', async (req, res) => {
  const short = parseInt(req.params.short);
  const urlDoc = await Url.findOne({ short_url: short });

  if (!urlDoc) return res.json({ error: 'No short URL found' });

  res.redirect(urlDoc.original_url);
});

// Server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
});
