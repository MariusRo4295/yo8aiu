# yo8aiu.ro — amateur radio station website

Source of **[yo8aiu.ro](https://yo8aiu.ro)**, the website of amateur radio station **YO8AIU** (Romania).

- Single-page site (`index.html`) with news, gallery and station info, backed by **Firebase** (Firestore + Storage)
- `upload.php` — image/video upload endpoint used by the site (file type decided by content, not by name)
- `index.js` + `package.json` — Firebase Cloud Function that connects the site's "cmc" chatbot to an AI API
  without exposing the API key in the browser (setup guide in Romanian: [README_CLOUD_FUNCTION.md](README_CLOUD_FUNCTION.md))

## Server note (nginx)

Never let the web server execute scripts from the uploads folder:

```nginx
location ^~ /uploads/ {
    location ~ \.php$ { deny all; }
}
```

## Author

Marius — YO8AIU · student and radio amateur from Romania
