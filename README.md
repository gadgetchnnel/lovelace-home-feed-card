# lovelace-home-feed-card
A custom Lovelace card for displaying a combination of persistent notifications, calendar events, and entities in the style of a feed.

## Installation

You can install this manually or via [HACS](https://github.com/custom-components/hacs) or [custom_updater](https://github.com/custom-components/custom_updater)(deprecated) if you want easy updating,

### Manually
Download all files and place them in the folder **www/custom-lovelace/home-feed-card** under your Home Assistant config folder.

Reference the file under resources like this:

    resources:
      - url: /local/custom-lovelace/home-feed-card/lovelace-home-feed-card.js?v=0.0.0
        type: js

### With HACS
Search for "Lovelace Home Feed Card" in the store and follow the instructions
    
### With custom_updater (deprecated)
    resources:
      - url: /customcards/github/gadgetchnnel/lovelace-home-feed-card.js?track=true
        type: js

Alternatively, you can add https://raw.githubusercontent.com/gadgetchnnel/lovelace-home-feed-card/master/custom_card.json to the card_urls in custom_updater if you want to do it that way.

### Version 0.2.4 and Firefox

Version 0.2.4 uses dynamic module imports to import the Moment module. Firefox versions < 66 don't support these by default and you may need to set the `javascript.options.dynamicImport` option in  `about:config` for it to work.

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
* For other single-valued entities the default message text is in the format "*entity name* @ *state*" (but can be customized by using the **content_template** option, see below) and the time is the last modified time of the entity.

Each entity can be just an entity id or an **entity** object, allowing more customisation.

### show_empty (optional, defaults to true)
Whether to show the card if there are no items to show

### scrollbars_enabled (optional, defaults to true)
This controls whether the feed is scrollable. If this is set to false then, by default, all items will be displayed unless the **max_height** or **max_item_count** option is used.

### max_height (optional, defaults to 28em when scrollbars enabled, otherwise unlimited)
The maximum height of the feed in CSS format (e.g. "100px", "20em", etc.). When scrollbars are disabled, the content will be cut off at this height, otherwise it will control the scrollable height.

### max_item_count (optional, defaults to unlimited)
The maximum number of items to show in the feed, useful if scrollbars are disabled.

## Entity object

For single-item entities the following options are supported, see the section on multi-item entities for the options available for those.

### name (optional)
This allows overriding the display name of the entity, otherwise the friendly name is used

### icon (optional)
Allows overriding the icon of the entity

### content_template (optional)
This allows the display format for that entity to be customised. The format is {{*propertyname*}}. The available properties are:
* **display_name** The entity name (friendly name if not overridden with the name option)
* **state** The state display name (based on device class of entity)

### include_history (optional, defaults to false)
This allows the history of an entity to be displayed, rather than just its current state (states of "unknown" are automatically filtered out).
This currently uses the history for the last day.

### max_history (optional)
The maximum history of the entity to display, this defaults to 3
In addition any attribute of the entity can be used (do not prefix with *attributes.*).

### remove_repeats (optional, defaults to true)
This controls whether to remove repeated states from the history (e.g. the current state is the same as the previous state).
Since "unknown" states are filtered out, this will avoid an entity appearing twice because it changed from "on" to "unknown" and back again following a restart.
This can be disabled by setting this to false.

### state_map (optional)
This allows custom mappings of states to display names, to override the device_class based mappings. In the example below this is used to map the "not_home" state to "Unknown Destination" instead of the default "Away".

Example:

    type: 'custom:home-feed-card'
      title: Home Feed
      show_empty: false
      id_filter: ^home_feed_.*
      entities:
          - entity: device_tracker.my_phone
            name: Me
            content_template: '{{display_name}} arrived at {{state}} ({{latitude}},{{longitude}})'
            include_history: true
            max_history: 5
            remove_repeats: false
            state_map:
              not_home: Unknown Destination

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

### timestamp_property (optional)
The property on the object which has the posted time. The property can be either a string in ISO format or a Unix timestamp. If this is not supplied, the modified timestamp of the entity is used.

### max_items (optional, defaults to 5)
The maximum number of items to display for this entity

### content_template (required)
This controls the message text which is displayed for each item. Any property on the object can be included as part of the text by using the format {{*propertyname*}}

Basic example, template generating text:

'{{title}}' -> 'Post title'

Advanced example, template generating Markdown:

'\[{{title}}\]({{url}})' -> "\[Post title\](https://www.reddit.com/r/...)"
This would be rendered as [Post title](https://www.reddit.com/r/...)



