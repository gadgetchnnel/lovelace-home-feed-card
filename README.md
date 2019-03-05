# lovelace-home-feed-card
A custom Lovelace card for displaying a combination of persistent notifications, calendar events, and entities in the style of a feed.

## Installation

Download all files and place them in the folder **www/custom-lovelace/home-feed-card** under your Home Assistant config folder.

Reference the file under resources like this:

    resources:
      - url: /local/custom-lovelace/home-feed-card/home-feed-card.js?v=0.0.0
        type: js

## Configuration

    type: 'custom:home-feed-card'
      title: Home Feed
      calendars:
        - calendar.home_calendar
        - calendar.work_calendar
      id_filter: ^home_feed_.*
      entities:
          - sensor.next_alarm_time
          - sensor.bin_collection


### calendars


