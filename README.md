# lovelace-home-feed-card
[![hacs_badge](https://img.shields.io/badge/HACS-Default-orange.svg?style=for-the-badge)](https://github.com/custom-components/hacs)

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
      more_info_on_tap: true
      entities:
          - sensor.next_alarm_time
          - entity: sensor.bin_collection
            name: Next Bin Collection
            more_info_on_tap: false
          - entity: sensor.reddit_help
            multiple_items: true
            list_attribute: posts
            timestamp_property: created_
            max_items: 5
            content_template: '[{{title}}]({{url}})'

![Example](https://user-images.githubusercontent.com/2099542/53899297-d0abb580-4031-11e9-8357-ac45c71e95f5.png)

### calendars (optional)
This is a list of calendar entities you want events to display for in your feed.

### calendar_days_back (optional, defaults to 0, added in 0.3.5b2)
The number of days before the current day to include calendar events for in the feed

### calendar_days_forward (optionla, defaults to 1, added in 0.3.5b2)
The number of days after the current day to include calendar events for in the feed. This will include events up to the end of that day so, if you only want the current day, this should be set to 0

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

### more_info_on_tap (optional, defaults to false)
When this is true, tapping/clicking and entity will display the more-info dialogue. This can be overridden for individual entities (see later). From version 0.3.0 this also supports notifications, calendar events and multi-item entities. Multi-item entities require the new **detail_template** option (see later).

### compact_mode (optional, defaults to false)
When this is true, a more compact layout is used where the time is displayed on the same line as the item content.
Note: Due to layout constraints this also removes the dismiss button from notifications and so notifications will always be clickable in compact mode even if **more_info_on_tap** is disabled.

### exact_durations (optional, defaults to false)
By default, durations of less than a minute are displayed as "<1 minute ago" or "in <1 minute". Setting this option to true disables this, and displays the exact duration.
**Note:** Doing this will make the time difference display refresh every second until the duration is 1 minute


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

### exclude_states (optional)
A list of states to exclude. By default this is just "unknown". For example:
    entities:
      - entity: sensor.front_door
        name: Front Door
        exclude_states:
          - "off"
          - "unknown"

### format (optional, defaults to "relative")
How the timestamp should be formatted.
Valid values are: relative, total, date, time and datetime.

### more_info_on_tap (optional)
This is the same as the option of the same name at the top level. This allows for this setting to be overridden at the entity level.

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

## Handling of Automations
Starting from 0.3.5b1, automations are handled slightly differently from other entities. The differences are as follows:

* The **last_triggered** attribute is used for the timestamp rather than the **last_changed** attribute, allowing them to be sorted by when they were triggered
* Automations which have never been triggered (**last_triggered** is None) will be excluded
* The state of automations will always be "Triggered", so will display by default as "*Automation Name* @ Triggered" in the feed (this can be overridden as normal using the **content_template** option)


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

### detail_template (optional)
This controls the content of the more-info popup when clicking on the item (if **more_info_on_tap** is enabled).
This works the same as the **content_template** option but, since it uses the built-in Markdown card, also supports Jinja2 templates. The item properties can be used in the Jinja2 template via the **config.item** property, for example "{{ config.item.body }}". Here is an example with a Reddit sensor:

```
- entity: sensor.reddit_homeassistant
  content_template: '{{title}}'
  detail_template: >
    {% if config.item.body != "" %}
      {{ config.item.body }}
    {% else %}
      {% if config.item.url.endswith(".jpg") or config.item.url.endswith(".png") %}
        ![{{ config.item.title }}]({{ config.item.url }})
      {% else %}
        [{{ config.item.title }}]({{ config.item.url }})
      {% endif %}
    {% endif %}
    
    
    [View on Reddit](https://www.reddit.com/r/homeassistant/comments/{{config.item.id }})
   
  list_attribute: posts
  max_items: 10
  multiple_items: true
  timestamp_property: created_utc
```
