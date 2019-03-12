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
      show_empty: false
      calendars:
        - calendar.home_calendar
        - calendar.work_calendar
      id_filter: ^home_feed_.*
      entities:
          - sensor.next_alarm_time
          - entity: sensor.bin_collection
            name: Next Bin Collection
          - entity: sensor.reddit_help
            multiple_items: true
            list_attribute: posts
            timestamp_property: created_
            max_items: 5
            content_template: '[{{title}}]({{url}})'

![Example](https://user-images.githubusercontent.com/2099542/53899297-d0abb580-4031-11e9-8357-ac45c71e95f5.png)

### calendars (optional)
This is a list of calendar entities you want events to display for in your feed.

### id_filter (optional)
This is a regular expression for filtering persistent notifications by notification id. In the example above, "^home_feed_.\*" will result in only notifications with ids starting with home_feed_ from being displayed.

### entities (optional)
A list of entities to display on the feed. These can be displayed as single items, or multiple items from a sensor attribute (see the section on multi-item entities).
Single item entities are displayed as follows:
* For sensors with a device_class of "timestamp" the message text is the entity name and the time is the state of the sensor.
* For other single-valued entities the message text is in the format "*entity name* @ *state*" and the time is the last modified time of the entity.

### show_empty (optional, defaults to true)
Whether to show the card if there are no items to show

## Multi-item Entities

Entities can made to appear as multiple items in your feed if they contain a list of objects as an attribute. For example, the Reddit sensor has attributes like this:

    {
      "posts": [
        {
          "title": "Post title",
          "created": 0000000000,
          "body": "Post body!",
          "score": 00,
          "comms_num": 00,
          "url": "https://www.reddit.com/r/*****",
          "id": "******"
        },
        {
          "title": "Another Post title",
          "created": 0000000000,
          "body": "Another Post body!",
          "score": 00,
          "comms_num": 00,
          "url": "https://www.reddit.com/r/*****",
          "id": "******"
        }]
    }
 
To add multi-item entities for this the following format would be used:

    type: 'custom:home-feed-card'
      title: Home Feed
      show_empty: false
      calendars:
        - calendar.home_calendar
        - calendar.work_calendar
      id_filter: ^home_feed_.*
      entities:
         - entity: sensor.reddit_<name>
            multiple_items: true
            list_attribute: posts
            timestamp_property: created
            max_items: 5
            content_template: '{{title}}'


### multiple_items (required)
This must be **true** to identify the entity as a multi-item entity

### list_attribute (required)
The attribute on the entity which holds the list of items which should be included in the feed

### timestamp_property (required)
The property on the object which has the posted time. The property can be either a string in ISO format or a Unix timestamp

### max_items (optional, defaults to 5)
The maximum number of items to display for this entity

### content_template (required)
This controls the message text which is displayed for each item. Any property on the object can be included as part of the text by using the format {{*propertyname*}}
The example above, '{{title}}' would just include the title property in the text for that item. Markdown is supported so, if you wanted to make the title clickable, you could use
'\[{{title}}\]({{url}})' which would result in, for example, "\[Post title\](https://www.reddit.com/r/*****)".



