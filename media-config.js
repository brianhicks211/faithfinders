/*
  FaithFinders media settings
  ---------------------------
  Add the church's live-stream and past-service video links below.

  Supported links:
  - YouTube watch links, youtu.be links, embed links, and live channel embeds
  - Vimeo video links
  - Direct public Facebook video links and Facebook embed/plugin URLs

  Example YouTube live embed:
  https://www.youtube.com/embed/live_stream?channel=YOUR_CHANNEL_ID

  Example past-service item:
  {
    title: "Sunday Worship Service",
    date: "2026-08-02",
    speaker: "Pastors Rita and Paul Slone",
    category: "Sunday Worship",
    videoUrl: "https://www.youtube.com/watch?v=VIDEO_ID",
    description: "FaithFinders Sunday worship service."
  }
*/
window.FAITHFINDERS_MEDIA = {
  live: {
    embedUrl: "https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2F100064259846821%2Fvideos%2F1034092655911042&show_text=false&autoplay=false&width=734",
    externalUrl: "",
    platform: "Facebook",
    statusText: "Featured service",
    isLive: false
  },
  services: [
    {
      title: "Sunday Service — August 9",
      date: "2026-08-09",
      speaker: "FaithFinders Church",
      category: "Sunday Service",
      videoUrl: "https://www.facebook.com/100064259846821/videos/1034092655911042",
      description: "FaithFinders Sunday worship service."
    },
    {
      title: "Sunday Service — August 2",
      date: "2026-08-02",
      speaker: "FaithFinders Church",
      category: "Sunday Service",
      videoUrl: "https://www.facebook.com/100064259846821/videos/867314006244238",
      description: "FaithFinders Sunday worship service."
    },
    {
      title: "Sunday Service — July 26",
      date: "2026-07-26",
      speaker: "FaithFinders Church",
      category: "Sunday Service",
      videoUrl: "https://www.facebook.com/100064259846821/videos/1060532843584361",
      description: "FaithFinders Sunday worship service."
    }
  ]
};
