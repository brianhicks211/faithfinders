FaithFinders Church Website Redesign
====================================

Files
-----
index.html          Home page
about-us.html       About Us / church history page
vision.html         Full FaithFinders vision page
service-times.html  Weekly service schedule and visitor information
watch.html          Live stream and searchable past-services video bank
give.html           Giving page with Luke 6:38 and church contact options
styles.css          Shared responsive styling
script.js           Navigation, dropdown, animation, and contact-form behavior
media-config.js     Live-stream and past-service video settings
media.js            Video player, archive search/filtering, and video modal
admin.html           Secure administrator portal
admin.css            Administrator portal styling
admin.js             Administrator login, uploads, and video management
supabase-config.js   Database connection settings
supabase-setup.sql   Secure database, storage, and access policies
ADMIN-SETUP.txt      One-time administrator portal setup guide

How to preview
--------------
Open index.html in a web browser. The Watch navigation dropdown opens the live stream and past-services archive.

Mobile support
--------------
The complete website and administrator portal are optimized for phones and tablets. Mobile behavior includes:

- A keyboard-accessible, touch-friendly navigation drawer
- Automatic navigation reset after rotating or resizing the device
- Safe spacing for modern phones with screen notches
- Full-width actions and 48-pixel minimum touch controls
- Responsive video players and a phone-sized video modal
- Single-column forms, cards, schedules, and administrator tools
- 16-pixel mobile form fields to prevent unwanted browser zoom
- A compact mobile administrator sign-in screen

How to publish
--------------
Upload the entire faithfinders-redesign folder to the web host. Keep the filenames and assets folder unchanged so links, styling, and scripts continue to work.

Connecting the live stream
--------------------------
1. Open media-config.js in a text editor.
2. Add a YouTube, Vimeo, or Facebook embed URL to live.embedUrl.
3. Add the normal public stream URL to live.externalUrl as a backup link.
4. Set live.isLive to true while the service is live, or leave it false to show “Stream connected.”

A YouTube channel live embed usually looks like:
https://www.youtube.com/embed/live_stream?channel=YOUR_CHANNEL_ID

Administrator portal
--------------------
The website is connected to the FaithFindersWeb Supabase project. Complete only the administrator-user step in ADMIN-SETUP.txt, then open admin.html and sign in. Administrators can:

- Upload MP4, WebM, MOV, or OGG service videos
- Paste Facebook, YouTube, or Vimeo links
- Add a custom thumbnail
- Publish or hide videos
- Select the featured service
- Edit or delete archive entries

The public Watch page reads published videos automatically from the connected database. The three existing services in media-config.js remain available as a safe fallback if the database connection is temporarily unavailable.

Manual fallback
---------------
Past services can still be added directly inside the services array in media-config.js. Example:

{
  title: "Sunday Worship Service",
  date: "2026-08-02",
  speaker: "Pastors Rita and Paul Slone",
  category: "Sunday Worship",
  videoUrl: "https://www.youtube.com/watch?v=VIDEO_ID",
  description: "FaithFinders Sunday worship service."
}

The website automatically creates the video cards, year filter, search results, thumbnails for YouTube videos, and in-page video player. Uploaded video files play in a native, comments-free player.

Contact details included
------------------------
FaithFinders Church
229 W. Second Street
Constantine, MI 49042
(269) 435-7474
rgafaithfinder@yahoo.com

Service schedule shown
----------------------
Sunday Morning Service: 10:15 AM - 12:15 PM
Wednesday Night Bible Study: 6:30 PM - 8:30 PM

Notes
-----
The contact form opens the visitor's default email application. A server-side form service can be connected later for submissions without an email app.
The Vision page's Constitution button currently opens an email request because no constitution file or URL was supplied.
No online payment URL was supplied, so the Give page directs visitors to contact the church for current giving options.

Brand asset
-----------
assets/faithfinders-logo.png — FaithFinders logo used in all page headers and footers.
assets/pastors-rita-and-paul-slone.jpg — Portrait of Pastors Rita and Paul Slone used on the About page.
