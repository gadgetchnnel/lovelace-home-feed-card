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
          - entity: sensor.bin_collection
            name: Next Bin Collection

![Example](https://user-images.githubusercontent.com/2099542/53899297-d0abb580-4031-11e9-8357-ac45c71e95f5.png)

### calendars (optional)
This is a list of calendar entities you want events to display for in your feed.

### id_filter (optional)
This is a regular expression for filtering persistent notifications by notification id. In the example above, "^home_feed_.\*" will result in only notifications with ids starting with home_feed_ from being displayed.

### entities (optional)
A list of entities to display on the feed. For sensors with a device_class of "timestamp" the message text is the entity name and the time is the state of the sensor. For all other entities the message text is in the format "*entity name* @ *state*" and the time is the last modified time of the entity.
