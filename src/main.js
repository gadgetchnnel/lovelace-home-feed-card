import { LitElement, html, css } from "./lit-element.js";
import { HomeFeedNotificationPopup, popUp } from "./popup.js";
import { versionGreaterOrEqual } from "./helpers/hass-version.js";
import { computeStateDisplay as computeStateDisplayHelper } from "./helpers/compute-state-display.js";
import { handleClick, computeStateDisplay as computeStateDisplayLegacy  } from "custom-card-helpers";
import { createCard } from "card-tools/src/lovelace-element";
import { getCalendarString } from "./locale.js";

class HomeFeedCard extends LitElement {
    constructor() {
		super();
		
		this.pageId = location.pathname.replace(/\//g,"_");
		this.configuredScrollbars = false;
		this.loadedNotifications = false;
		this.refreshingNotifications = false;
		this.feedContent = null;
		this.moment = require('moment');
		this.browser_language = window.navigator.userLanguage || window.navigator.language;
		if(this.browser_language == "hy") this.browser_language = "hy-am"; // "hy" (Armenian) wrongly maps to zh-tw (Taiwan Chinese)
		this.moment.locale(this.browser_language);
  	}
  	
	static get properties() { return {
    	_config: { type: Object },
    	hass: { type: Object }
  		};
  	}
	
	createRenderRoot() {
		return this;
	}
	
	get pageRoot() {
		let root = document.querySelector("home-assistant");
		root = root && root.shadowRoot;
    	root = root && root.querySelector('home-assistant-main');
    	root = root && root.shadowRoot;
    	root = root && root.querySelector('app-drawer-layout partial-panel-resolver');
    	root = root && root.shadowRoot || root;
    	root = root && root.querySelector('ha-panel-lovelace');
    	root = root && root.shadowRoot;
    	root = root && root.querySelector('hui-root');
    	
    	return root;
	}
	
	
	
	static get stylesheet() {
		return html`
			<style>
				ha-card {
			  		padding: 0 16px 16px 16px;
				}
				#notifications {
					margin: -4px 0;
				}
		
				#notifications > * {
					margin: 8px 0;
				}
				#notifications > div > * {
					overflow: hidden;
					padding-right: 1em;
				}
				
				.item-container {
					width: 100%;
					height: auto;
				}

				.item-left, .item-right {
					width: 20px;
					height: 100%;
					float: left;
				}

				.item-right {
					float: right;
				}
				
				.item-right ha-icon {
					cursor:pointer;
				}
				
				.item-content {
					overflow: auto;
					height: 100%;
				}
				
				state-badge {
					margin-top: -10px;
					margin-left: -10px;
				}
				
				.item-content ha-markdown p {
					margin-top: 0px;
				}
				.header {
					font-family: var(--paper-font-headline_-_font-family); -webkit-font-smoothing: var(--paper-font-headline_-_-webkit-font-smoothing); font-size: var(--paper-font-headline_-_font-size); font-weight: var(--paper-font-headline_-_font-weight); letter-spacing: var(--paper-font-headline_-_letter-spacing); line-height: var(--paper-font-headline_-_line-height);
					line-height: 30px;
					color: var(--primary-text-color);
					padding: 28px 0 12px;
					display: flex;
					justify-content: space-between;
					top: 0;
					z-index: 999;
					width: 100%;
				}
				.header .name {
					white-space: var(--paper-font-common-nowrap_-_white-space); overflow: var(--paper-font-common-nowrap_-_overflow); text-overflow: var(--paper-font-common-nowrap_-_text-overflow);
				}
				.state-card-dialog {
					cursor: pointer;
				}
				#notifications hr:last-child {
					display: none;
				}
				
				ha-markdown a {
        			color: var(--primary-color);
  				}
  				
  				ha-markdown img {
                  max-width: 100%;
                }
                
				ha-markdown.compact {
					max-width: 65%;
				}
				
				ha-markdown.compact p {
					max-width: 100%;
    				white-space: nowrap;
    				overflow: hidden;
    				text-overflow: ellipsis;
				}
	</style>
	`;
	}

	async updated(changedProperties) {
		if(!this.configuredScrollbars){
			var root = this.querySelector("ha-card #notifications");
			if(root && this._config){	
	  			if(this._config.scrollbars_enabled !== false || this._config.max_height){
	  				root.style.maxHeight = this._config.max_height ? this._config.max_height : "28em";
	  				root.style.overflow = this._config.scrollbars_enabled !== false ? "auto" : "hidden";
				}
				this.configuredScrollbars = true;
			}
		}
	}

	render() {
		if(!this._hass || !this.moment){
			return html``;
		} 
		else{
			if(this.feedContent != null){
				if(this.feedContent.length === 0 && this._config.show_empty === false){
					return html``;
				}
				else{
				return html`
				${HomeFeedCard.stylesheet}
				<ha-card id="card">
					${!this._config.title
					? html``
					: html`
						  <div id="header" class="header">
						  <div class="name">${this._config.title}</div>
						</div>
					  `}
					<div id="notifications">${this.feedContent.map((i) => this._renderItem(i))}</div>
				</ha-card>
			`;
			
					}
			}
			else{
				return html``;
			}
		}
	}
	get cacheId() {
		return this._config.card_id ? this._config.card_id : this.pageId + this._config.title;
	}
	
    clearCache() {
    	localStorage.removeItem('home-feed-card-events' + this.cacheId);
	 	localStorage.removeItem('home-feed-card-eventsLastUpdate' + this.cacheId);
	 	localStorage.removeItem('home-feed-card-notifications' + this.cacheId);
	 	localStorage.removeItem('home-feed-card-notificationsLastUpdate' + this.cacheId);
	 	localStorage.removeItem('home-feed-card-history' + this.cacheId);
    }
    
    setConfig(config) {
	  if(!config)
      	throw new Error("Invalid configuration");
	  this._config = config;
      this.entities = this.processConfigEntities(this._config.entities);
      this.calendars = this._config.calendars;
	  setTimeout(() => this.buildIfReady(), 10);
      this.notificationMonitor();
	}
  
  processConfigEntities(entities) {
  		if(!entities) return [];
  		
  		if (!Array.isArray(entities)) {
    		throw new Error("Entities need to be an array");
  		}
  		
		return entities.map((entityConf, index) => {
			if (typeof entityConf === "string") {
      			entityConf = { entity: entityConf, exclude_states: ["unknown"] };
    		} else if (typeof entityConf === "object" && !Array.isArray(entityConf)) {
      			if (!entityConf.entity) {
        			throw new Error(
          				`Entity object at position ${index} is missing entity field.`
        			);
        		 }
        		 
        		 if(!entityConf.exclude_states){
        		 	entityConf = { ...entityConf, exclude_states: ["unknown"]};
        		 }
    		} else {
      			throw new Error(`Invalid entity specified at position ${index}.`);
    		}
			return entityConf;
  		});
	}
  
  computeStateDisplay(stateObj, entityConfig){
  	let domain = entityConfig.entity.split('.')[0];
  	
  	if(domain == "automation"){
  		return "Triggered";
  	}
  	
  	var state = entityConfig.state_map && entityConfig.state_map[stateObj.state] ? entityConfig.state_map[stateObj.state] : null;
  	
  	if(!state){
  		state = versionGreaterOrEqual(this.hass_version, "0.109.0") 
  			? computeStateDisplayHelper(this._hass.localize, stateObj) 
  			: computeStateDisplayLegacy(this._hass.localize, stateObj);
  	}
  	
  	return state;
  }
  
  getIcon(stateObj, icon){
	
	if(icon) {
		return icon;
	}
	
	if(stateObj.attributes && stateObj.attributes.icon)
	{
		return stateObj.attributes.icon
	}
	
  	return icon;
  }
  
  getEntities() {
  		let data = this.entities.filter(i => i.multiple_items !== true && i.include_history !== true).map(i => {
  		let stateObj = this._hass.states[i.entity];
  		
  		if(stateObj == null) {
  			return { entity_id: i.entity, icon: null, entity: i.entity, display_name: this._hass.localize(
            "ui.panel.lovelace.warning.entity_not_found",
            "entity",
            i.entity
          	), more_info_on_tap: false, 
          	content_template: null, state: "unavailable", stateObj: null, item_type: "unavailable",   };
  		}
  		let domain = i.entity.split(".")[0];
  		if(!i.exclude_states.includes(stateObj.state) 
  		&& (domain != "automation" || stateObj.attributes.last_triggered) // Exclude automations which have never been triggered
  		)
  		{
  			return { ...stateObj, icon: this.getIcon(stateObj, i.icon), entity: i.entity, display_name: ((i.name) ? i.name : stateObj.attributes.friendly_name), format: (i.format != null ? i.format : "relative"), more_info_on_tap: i.more_info_on_tap, content_template: i.content_template, state: this.computeStateDisplay(stateObj, i), stateObj: stateObj, item_type: "entity",   };
	 	}
	 	else{
	 		return null;
	 	}
	 	});
	 	
	 	return data.filter(entity => entity != null);
	}
  
  applyTemplate(item, template, translateToJinja = false){
  	var result = template;
  	
  	// If the item is just a string (e.g. Todoist calendar as a multi-item entity) convert to an object with a key of "value"
  	
  	if(typeof item === "string") item = {value: item};
  	
  	Object.keys(item).forEach(p => {
  		result = result.replace("{{" + p + "}}", translateToJinja ? "{{ config.item." + p + " }}" : item[p]);
  	});
  	
  	if(item.attributes)
  	{
  		Object.keys(item.attributes).forEach(p => {
  			result = result.replace("{{" + p + "}}", item.attributes[p]);
  		});
  	}
  	
  	return result;
  }
  
  getMultiItemEntities() {
  		let data = this.entities.filter(i => i.multiple_items === true && i.list_attribute && i.content_template).map(i =>{
  			let stateObj = this._hass.states[i.entity];
  			let icon = this.getIcon(stateObj, i.icon)
  			
  			let items = (stateObj.attributes[i.list_attribute]) ? stateObj.attributes[i.list_attribute] : [];
  			
  			return items.map(p => {
  				let created = (i.timestamp_property && p[i.timestamp_property]) ? p[i.timestamp_property] : stateObj.last_changed;
  				let timeStamp = isNaN(created) ? created : new Date(created * 1000);
  				return { ...stateObj, icon: icon, format: (i.format != null ? i.format : "relative"), entity: i.entity, display_name: this.applyTemplate(p, i.content_template), last_changed: timeStamp, stateObj: stateObj, more_info_on_tap: i.more_info_on_tap, item_data: p, detail: i.detail_template ? this.applyTemplate(p, i.detail_template, false) : null,  item_type: "multi_entity",   };
  			}).sort((a, b) => (a.last_changed < b.last_changed) ? 1 : -1) // Sort in reverse order of time to ensure latest items always first
  			.slice(0, (i.max_items) ? i.max_items : 5);
  		});
	 	
	 	return [].concat.apply([], data);
	}
  
  getHistoryState(stateObj, item){
  	var newStateObj = {};
  	Object.assign(newStateObj, stateObj);
  	newStateObj.attributes = item.attributes;
  	newStateObj.state = item.state;
  	newStateObj.last_changed = item.last_changed;
  	newStateObj.last_updated = item.last_updated;
  	return newStateObj;
  }
  
  repeatFilter(item, index, arr, remove_repeats, keep_latest){
  	if(!remove_repeats) return true;
  	
  	var repeated = (arr[index-1] && item.state == arr[index-1].state);
  	if(!repeated || (keep_latest === true && index == arr.length - 1)){
  		// Not repeated or keep latest option is enabled and this is the latest
  		return true;
  	}
  	else{
  		return false;
  	}
  }

  async getLiveEntityHistory() {
  	var entity_ids = this.entities.filter(i => i.include_history == true).map(i => i.entity).join();
  	
  	if(!entity_ids || entity_ids.length == 0) return []; // Don't need to call history API if there are no items requiring history
  	let historyDaysBack = (this._config.history_days_back ? this._config.history_days_back : 0);
	const start = this.moment.utc().startOf('day').add(-historyDaysBack, 'days').format("YYYY-MM-DDTHH:mm:ss");
    const end = this.moment.utc().format("YYYY-MM-DDTHH:mm:ss");
    
  	let history = (await this._hass.callApi('get', `history/period/${start}Z?end_time=${end}Z&filter_entity_id=${entity_ids}`))
  	              .map(arr => {
  				let entityConfig = this.entities.find(entity => entity.entity == arr[0].entity_id);
  				let stateObj = this._hass.states[entityConfig.entity];
  				let remove_repeats = entityConfig.remove_repeats !== false;
  				return arr.filter(i => !entityConfig.exclude_states.includes(i.state))
  			  			  .filter((item,index,arr) => { return this.repeatFilter(item, index, arr, remove_repeats, entityConfig.keep_latest) })
  			  			  .reverse()
  			  			  .slice(0,entityConfig.max_history ? entityConfig.max_history : 3)
  			  			  .map(i => {
  			  			  	return { ...i, icon: this.getIcon(stateObj, entityConfig.icon), display_name: ((entityConfig.name) ? entityConfig.name : i.attributes.friendly_name), format: (entityConfig.format != null ? entityConfig.format : "relative"), more_info_on_tap: entityConfig.more_info_on_tap, content_template: entityConfig.content_template, state: this.computeStateDisplay(i,entityConfig), latestStateObj: stateObj,  stateObj: this.getHistoryState(stateObj,i), item_type: "entity_history",   };
  			  			  });
  			  	 });
  	return [].concat.apply([], history);
  }
  
  async refreshEntityHistory() {
  	if(!this._config.entities || this._config.entities.length == 0){
  		// Remove cached history items if there are no entities
  		if(JSON.parse(localStorage.getItem('home-feed-card-history' + this.cacheId))){
  			localStorage.removeItem('home-feed-card-history' + this.cacheId);
  		}
  		return;
  	}
  	
  	let entityHistory = await this.getLiveEntityHistory();
  	localStorage.setItem('home-feed-card-history' + this.cacheId, JSON.stringify(entityHistory));
  	
	this.buildIfReady();
  }
  
  eventTime(eventTime)
   {
		return ((eventTime.date) ? eventTime.date : (eventTime.dateTime) ? eventTime.dateTime : eventTime);   	
   }
   
   eventAllDay(event){
   		var allDay = false;
   		if(event.start.date){
				allDay = true;
		}
		else if(event.start.dateTime){
			allDay = false;	
		}
		else{
			let start = this.moment(event.start);
			let end = this.moment(event.end);
			let diffInHours = end.diff(start, 'hours');
			allDay = (diffInHours >= 24);
		}
		
		return allDay;
   }
   
  async getEvents() {
	if(!this.calendars || this.calendars.length == 0) return [];
	let lastUpdate = JSON.parse(localStorage.getItem('home-feed-card-eventsLastUpdate' + this.cacheId));
	if(!lastUpdate || (this.moment && this.moment().diff(lastUpdate, 'minutes') > 15)) {
		let calendarDaysBack = (this._config.calendar_days_back ? this._config.calendar_days_back : 0);
		let calendarDaysForward = (this._config.calendar_days_forward ? this._config.calendar_days_forward : 1);
		const start = this.moment.utc().startOf('day').add(-calendarDaysBack, 'days').format("YYYY-MM-DDTHH:mm:ss");
		const end = this.moment.utc().startOf('day').add(calendarDaysForward + 1, 'days').format("YYYY-MM-DDTHH:mm:ss");
		try{
			var calendars = await Promise.all(
        	this.calendars.map(
          		async calendar => {
          			let url = `calendars/${calendar}?start=${start}Z&end=${end}Z`;
          			let result = await this._hass.callApi('get', url);
          			return result.map(x => { return {...x, calendar: calendar} });
          		  }));
        }
        catch(e){
        	console.error("Error getting calendar events");
        	var calendars = [];
        }
        
    	var events = [].concat.apply([], calendars);
    	var data = events.map(i => {
	 		let event = { ...i, display_name: i.summary ? i.summary : i.title, start_time: this.eventTime(i.start), end_time: this.eventTime(i.end), all_day: this.eventAllDay(i), format: "relative", item_type: "calendar_event" };
	 		let startDateTime = this.moment(new Date(event.start_time));
	 		let endDateTime = this.moment(new Date(event.end_time));
	 		let eventTime = "";
	 		if(event.all_day){
	 			endDateTime = endDateTime.startOf('day').add(-1, 'hours');
	 			if(startDateTime.clone().startOf('day').isSame(endDateTime.clone().startOf('day'))) // One day event
	 			{
	 				eventTime = `${startDateTime.format("dddd, D MMMM")}`;
	 			}
	 			else if(startDateTime.month() == endDateTime.month()){
	 				eventTime = `${startDateTime.format("D")} - ${endDateTime.format("D MMMM YYYY")}`;
	 			}
	 			else if(startDateTime.year() == endDateTime.year())
	 			{
	 				eventTime = `${startDateTime.format("D MMMM")} - ${endDateTime.format("D MMMM YYYY")}`;
	 			}
	 			else {
	 				eventTime = `${startDateTime.format("D MMMM YYYY")} - ${endDateTime.format("D MMMM YYYY")}`;
	 			}
	 		}
	 		else
	 		{
	 			if(startDateTime.clone().startOf('day').isSame(endDateTime.clone().startOf('day'))) // Start and end same day
	 			{
	 				if(startDateTime.format("a") == endDateTime.format("a"))
	 				{
	 					eventTime = `${startDateTime.format("dddd, D MMMM")}  ⋅ ${startDateTime.format("h:mm")} - ${endDateTime.format("h:mm a")}`;
	 				}
	 				else{
	 					eventTime = `${startDateTime.format("dddd, D MMMM")}  ⋅ ${startDateTime.format("h:mm a")} - ${endDateTime.format("h:mm a")}`;
	 				}		
	 			}
	 			else
	 			{
	 				eventTime = `${startDateTime.format("D MMMM YYYY, h:mm a")} - ${endDateTime.format("D MMMM YYYY, h:mm a")}`;
	 			}
	 		}
	 		event.detail = `<ha-icon icon="mdi:clock"></ha-icon> ${eventTime}
	 		
 <ha-icon icon="mdi:calendar"></ha-icon> ${this._hass.states[i.calendar].attributes["friendly_name"]}
	 		`;
	 		return event;
	 	});
	 	
	 	localStorage.setItem('home-feed-card-events' + this.cacheId,JSON.stringify(data));
	 	localStorage.setItem('home-feed-card-eventsLastUpdate' + this.cacheId,JSON.stringify(this.moment()));
	 	return data;
	 }
	 else{
	 	return JSON.parse(localStorage.getItem('home-feed-card-events' + this.cacheId));
	 }
  }
   notificationIdToTitle(id) {
			return id.replace(/[^a-zA-Z0-9]/g," ").toLowerCase().replace(/\b(\w)/g, s => s.toUpperCase());
   }
   
   async refreshNotifications() {
   	 if(!this._hass) return;
     
     
     if(this.refreshingNotifications) return;
     
   	 this.refreshingNotifications = true;
     var response = await this._hass.callWS({type: 'persistent_notification/get'});
     if(this._config.id_filter) {
		response = response.filter(n => n.notification_id.match(this._config.id_filter));
	 }
	 let data = response.map(i => {
	 	return { ...i, title: i.title ? i.title: this.notificationIdToTitle(i.notification_id), format: "relative", item_type: "notification", original_notification: i };
	 });
	 localStorage.setItem('home-feed-card-notifications' + this.cacheId,JSON.stringify(data));
	 
	 if(this.moment){
	 	localStorage.setItem('home-feed-card-notificationsLastUpdate' + this.cacheId,JSON.stringify(this.moment()));
	 }
	 
	 this.refreshingNotifications = false;
	 this.loadedNotifications = true;
	 this.buildIfReady();
   }
   
   getNotifications() {
   	 if(!JSON.parse(localStorage.getItem('home-feed-card-notifications' + this.cacheId))) return [];
   	 
     return JSON.parse(localStorage.getItem('home-feed-card-notifications' + this.cacheId));
   }
   
   async getEntityHistoryItems() {
   	if(!JSON.parse(localStorage.getItem('home-feed-card-history' + this.cacheId))) return [];
   	return JSON.parse(localStorage.getItem('home-feed-card-history' + this.cacheId));
   }
   
   getItemTimestamp(item)
   {
		switch(item.item_type)
    		{
    			case "notification":
    				return item.created_at;
    			case "calendar_event":
    				return item.start_time;
    			case "entity":
    			case "entity_history":
    			case "multi_entity":
    				if(item.attributes.device_class === "timestamp"){
    					return item.state;
    				}
    				else{
    					let domain = item.entity_id.split('.')[0];
    					
    					if(domain == "automation")
    					{
    						return item.attributes.last_triggered;
    					}
    					else{
    						return (item.attributes.last_changed ? item.attributes.last_changed : item.last_changed);
    					}
    					
    				}
    			default:
    				return new Date().toISOString();
    		}
   }
   
   debugItem(){
   		if(!this._config.debug) return [];
   		let cachedHistory = localStorage.getItem('home-feed-card-history' + this.cacheId);
   		let debugData = "## Debug Information\n\n"+
   						"**Cache Id:** " + this.cacheId + "\n\n"+
   						"**Cache Status:** " + (cachedHistory ? "From Cache" : "Live") + "\n\n"+
   						"**Language (Home Assistant):** " + (this._hass ? this._hass.language : "unknown") + "\n\n"+
   						"**Language (Browser):** " + (this.browser_language ? this.browser_language : "unknown");
   		
   		return [{ 	state: "on", 
   					attributes: {device_class: "debug"},
   					icon: "mdi:bug", 
   					format: "relative", 
   					entity_id: "home_feed.debug_info", 
   					entity: "home_feed.debug_info", 
   					display_name: debugData, 
   					last_changed: new Date(), 
   					stateObj: null, 
   					more_info_on_tap: true, 
   					item_data: null, 
   					detail: debugData,
   					content_template: "{{display_name}}",
   					item_type: "entity"   
   				}];
   }
   async getFeedItems(){
   		var allItems = [].concat .apply([], await Promise.all([this.debugItem(), this.getNotifications(), this.getEvents(), this.getEntities(), this.getMultiItemEntities(), this.getEntityHistoryItems()]));
   		var now = new Date();
   		allItems = allItems.map(item => {
   			let timeStamp = this.getItemTimestamp(item);
   			let tsDate = new Date(timeStamp);
   			let diff = ((now - tsDate) / 1000);
    		return {...item, timestamp: timeStamp, timeDifference: { value: diff, abs: Math.abs(diff), sign: Math.sign(diff) } }; 
   		});
   		
   		var sorted = allItems.sort((a,b) => {
   			if (a.timeDifference.abs < b.timeDifference.abs) return -1;
  			if (a.timeDifference.abs > b.timeDifference.abs) return 1;
  			return 0;	
   		});
   		
   		return sorted;
   }
   
   _handleDismiss(event) {
   var id = event.target.notificationId;
    this._hass.callService("persistent_notification", "dismiss", {
      notification_id: id
    });   
  }
  
  _moreInfoHeaderClick(event) {
   let moreInfo = document.querySelector("home-assistant")._moreInfoEl;
   moreInfo.large = !moreInfo.large;
  }
  
  provideHass(element) {
	if(document.querySelector('hc-main'))
    	return document.querySelector('hc-main').provideHass(element);
	if(document.querySelector('home-assistant'))
		return document.querySelector("home-assistant").provideHass(element);
	
	return undefined;
  }
 
  fireEvent(ev, detail, entity=null) {
    ev = new Event(ev, {
      bubbles: true,
      cancelable: false,
      composed: true,
    });
    ev.detail = detail || {};
    if(entity) {
      entity.dispatchEvent(ev);
    } else {
      var root = document.querySelector("home-assistant");
      root = root && root.shadowRoot;
      root = root && root.querySelector("home-assistant-main");
      root = root && root.shadowRoot;
      root = root && root.querySelector("app-drawer-layout partial-panel-resolver");
      root = root && root.shadowRoot || root;
      root = root && root.querySelector("ha-panel-lovelace");
      root = root && root.shadowRoot;
      root = root && root.querySelector("hui-root");
      root = root && root.shadowRoot;
      root = root && root.querySelector("ha-app-layout #view");
      root = root && root.firstElementChild;
      if (root) root.dispatchEvent(ev);
    }
  }
  
  moreInfo(entity) {
    this.fireEvent("hass-more-info", {entityId: entity});
  }
  
  _handleClick(ev) {
  		let item = ev.currentTarget.item;
  		
  		if(item.item_type == "entity_history")
  		{
  			let mock_hass = {};
  			Object.assign(mock_hass, this._hass);
  			mock_hass.states = [];
  			mock_hass.states[item.entity_id] = item.stateObj;
  			
  			let config = {"type":"custom:hui-entities-card", "entities": [{"entity":item.entity_id,"secondary_info":"last-changed"}, {"type":"custom:hui-history-graph-card","entities":[item.entity_id]}]};
  			let popup = createCard(config);
  			
  			popup.hass = mock_hass;
   			
   			
   			 
   			setTimeout(()=>{
   				let card = popup.shadowRoot.querySelector('ha-card #states');
   				if(card){
   					card.querySelectorAll("div")[1]
   					.querySelector("hui-history-graph-card")
   					.shadowRoot
   					.querySelector('ha-card')
   					.style.boxShadow = 'none';
   				}
   			},100);
   			
  			
   			popUp(item.display_name, popup);
  		}
  		else if(item.item_type == "multi_entity" || item.item_type == "calendar_event"){
  			let mock_hass = {};
  			Object.assign(mock_hass, this._hass);
  			
  			let config = {"type":"custom:hui-markdown-card", "content": item.detail, "item": item.item_data};
  			let popup = createCard(config);
  			popup.hass = this._hass;
  			
  			setTimeout(()=>{
  				let card = popup.shadowRoot.querySelector('ha-card');
  				if(card){
  					card.style.maxHeight = "300px";
  					card.style.overflow = "auto";
  				}
  			},100);
  			
  			let maxTitleLength = 80;
  			let title = item.display_name;
  			if(title.length > maxTitleLength) title = title.substring(0,maxTitleLength - 3) + "...";
   			popUp(title, popup, false);
  		}
  		else if(item.item_type == "notification")
  		{
  			let notification = item.original_notification;
  			if(!notification.title) notification.title = this.notificationIdToTitle(notification.notification_id);
  			let popup = document.createElement("home-feed-notification-popup");
  			popup.notification = notification;
  			popup.hass = this._hass;
  			
  			popUp(notification.title, popup, false);
  		}
  		else
  		{
  			handleClick(this, this._hass, {"entity":item.entity_id, 
   				"tap_action":{"action":"more-info"}}, false, false); 
   		}
	}
	
	
	_computeTooltip(hass, notification) {
    if (!hass || !notification) {
      return undefined;
    }

    const d = new Date(notification.created_at);
    return d.toLocaleDateString(this._hass.language, {
      year: "numeric",
      month: "short",
      day: "numeric",
      minute: "numeric",
      hour: "numeric",
    });
  }
	_buildFeed() {
    	if(!this._hass) return;
		
		var feedContent = [];
		
    	this.getFeedItems().then(items =>
	  	{
	  		if(this._config.max_item_count) items.splice(this._config.max_item_count);
	  		this.feedContent = items;
			this.requestUpdate();
  		});
	}
	
	_renderItem(n) {
		let compact_mode = this._config.compact_mode === true;
		
		switch(n.item_type)
		{
			case "notification":
				var icon = "mdi:bell";
				if(this._config.show_notification_title){
					var contentText = "<font size='+1em'><b>" + n.title + "</b></font>\n\n" + n.message;
				}
				else{
					var contentText = n.message;
				}
				break;
			case "calendar_event":
				var icon = "mdi:calendar";
				var contentText = n.display_name;
				break;
			case "entity":
			case "entity_history":
				var icon = n.icon;
				let domain = n.entity_id.split('.')[0];
				
				if(n.attributes.device_class === "timestamp"){
					var contentText = `${n.display_name}`;
					if(!icon) var icon = "mdi:clock-outline";
				}
				else{
					if(n.content_template){
						var contentText = this.applyTemplate(n, n.content_template);
					}
					else{
						var contentText = `${n.display_name} @ ${n.state}`;
					}
				}
				break;
			case "multi_entity":
				var icon = n.icon;
				
				var contentText = `${n.display_name}`;
				break;
			case "unavailable":
				var icon = "mdi:alert-circle";
				
				var contentText = `${n.display_name}`;
				break;
			default:
				var icon = "mdi:bell";
				var contentText = "Unknown Item Type";
		}
		
		//if(compact_mode && n.item_type != "notification")
		//{
		//	let maxContentLength = 50;
  		//	if(contentText.length > maxContentLength) contentText = contentText.substring(0,maxContentLength - 3) + "...";
  		//}	
			
		if(!n.stateObj && !icon){ 
			icon = "mdi:bell";
		}
		
		var clickable = false;
		var contentClass = '';

		let more_info_on_tap = (typeof n.more_info_on_tap !== 'undefined') ? n.more_info_on_tap : this._config.more_info_on_tap;
		
		if(more_info_on_tap) {
			switch(n.item_type) {
				case "entity":
				case "entity_history":
				case "notification":
					clickable = true;
					break;
				case "multi_entity":
				case "calendar_event":
					clickable = !!n.detail;
					break;
				
			}	
		}
		if(compact_mode && n.item_type == "notification") clickable = true; // Notifications always clickable in compact mode
		
		if(clickable){
			contentClass = "state-card-dialog";
		}
		
		var allDay = (n.item_type == "calendar_event" && n.all_day);
		
		var timeItem;
		
		if(allDay){
			let date = n.start.date ? this.moment(n.start.date).startOf('day') : this.moment(n.start).startOf('day');
			let endDate = (n.end.date ? this.moment(n.end.date).startOf('day') : this.moment(n.end).startOf('day'));
			// Fix end date for all day events
			endDate = endDate.add(-1, 'hours').startOf('day');
			
			let days = Math.abs(date.diff(this.moment().startOf('day'),'days'));
			
			if(days <= 7){
				var timeString = getCalendarString(date);
				
				if(endDate > date) {
      				let endTimeString = getCalendarString(endDate);
      				if(endTimeString == endDate.format("L")){
      					endTimeString = endDate.toDate().toLocaleDateString(this._hass.language, {
        					year: "numeric",
        					month: "long",
        					day: "numeric",
      					});
      				}
      				timeString = timeString + " - " + endTimeString;
      			}
      			
				timeItem = html`<div style="display:block; ${compact_mode ? "float:right" : "clear:both;"}" title="${date.toDate()} - ${endDate.toDate()}">${timeString}</div>`;
			}
			else{
				var timeString = date.toDate().toLocaleDateString(this._language, {
        			year: "numeric",
        			month: "long",
        			day: "numeric",
      			});
      			
      			if(endDate > date) {
      				timeString = timeString + " - " + endDate.toDate().toLocaleDateString(this._hass.language, {
        				year: "numeric",
        				month: "long",
        				day: "numeric",
      				});
      			}
				
				timeItem = html`<div style="display:block; ${compact_mode ? "float:right" : "clear:both;"}" title="${date.toDate()} - ${endDate.toDate()}">${timeString}</div>`;
			}
		}
		else
		{
			let exact_durations = this._config.exact_durations === true;
				
			if(isNaN(n.timeDifference.value)){
				timeItem = html`<div style="display:block; ${compact_mode ? "float:right" : "clear:both;"}">${n.timestamp}</div>`;
			}
			else if(n.timeDifference.abs < 60 && n.format == "relative" && !exact_durations) {
				// Time difference less than 1 minute, so use a regular div tag with fixed text.
				// This avoids the time display refreshing too often shortly before or after an item's timestamp
				
				if(this._language != "en")
				{
					let timeDesc = this._hass.localize("ui.components.relative_time.duration.minute", "count", 1).replace("1", "<1");
					let tense = n.timeDifference.sign >= 0 ? "past" : "future";
					let timeString = this._hass.localize(`ui.components.relative_time.${tense}`, "time", timeDesc);
					timeItem = html`<div style="display:block; ${compact_mode ? "float:right" : "clear:both;"}" title="${new Date(n.timestamp)}">${timeString}</div>`;
				}
				else{
					let timeString = n.timeDifference.sign == 0 ? "now" : n.timeDifference.sign == 1 ? "<1 minute ago" : "in <1 minute";
					timeItem = html`<div style="display:block; ${compact_mode ? "float:right" : "clear:both;"}" title="${new Date(n.timestamp)}">${timeString}</div>`;
				}
			}
			else {
				// Time difference creater than or equal to 1 minute, so use hui-timestamp-display in relative mode
				timeItem = html`<hui-timestamp-display
									style="display:block; ${compact_mode ? "float:right" : "clear:both;"}"
									.hass="${this._hass}"
									.ts="${new Date(n.timestamp)}"
									.format="${n.format}"
									title="${new Date(n.timestamp)}"
								></hui-timestamp-display>
              				`;
			}
		}
		
		

		if(n.item_type == "notification" && !compact_mode){
			var closeLink = html`<ha-icon icon='mdi:close' .notificationId='${n.notification_id}' @click=${this._handleDismiss}</ha-icon>`;
		}
		else{
			var closeLink = html``;
		}
		
		let stateObj = n.stateObj ? n.stateObj : {"entity_id": "", "state": "unknown", "attributes":{}};
		//let contentItem = n.item_type == "multi_entity" ? n.item_data : n.stateObj; 
		
		return html`
		<div class="item-container">
			<div class="item-left">
				<state-badge .stateColor=${this._config.state_color} .stateObj='${stateObj}' .overrideIcon='${icon}'/>
			</div>
			<div class="item-right">
				${closeLink}
			</div>
			<div class="item-content ${contentClass}" .item=${n} @click=${clickable ? this._handleClick : null}>
				${this.itemContent(n, compact_mode, contentText)}
				${n.item_type != "unavailable" && n.entity_id != "home_feed.debug_info" ? timeItem : null}
			</div>
		</div>
		${compact_mode ? html`` : html`<hr style="clear:both;"/>`}
		`;
	}
  	
  	itemContent(item, compact_mode, contentText){
  		if(item.item_type == "unavailable"){
  			return html`
  			<hui-warning class="markdown-content ${compact_mode ? "compact" : ""}" style="float:left;">${contentText}</hui-warning>
  			`;
  		}
  		return html`
  		<ha-markdown class="markdown-content ${compact_mode ? "compact" : ""}" style="float:left;" .content=${contentText}></ha-markdown>
  		`;
  	}
  	get notificationButton() {
      if(!this._notificationButton){
      	this._notificationButton = this.rootElement.querySelector("hui-notifications-button");
      }
      
      return this._notificationButton;
    }
    
  	get rootElement() {
      if(!this._root){
      	this.recursiveWalk(document, node => {
    		if(node.nodeName == "HUI-ROOT"){
    			this._root = node.shadowRoot;
    			return node.shadowRoot;
    		}
    		else{
    			return null;
    		}
      	});
      }
      return this._root;
    }

    // Walk the DOM to find element.
    recursiveWalk(node, func) {
      let done = func(node);
      if (done) return true;
      if ("shadowRoot" in node && node.shadowRoot) {
        done = this.recursiveWalk(node.shadowRoot, func);
        if (done) return true;
      }
      node = node.firstChild;
      while (node) {
        done = this.recursiveWalk(node,func);
        if (done) return true;
        node = node.nextSibling;
      }
    }
    
    notificationMonitor() {
	  let oldNotificationCount = this.notificationCount ? this.notificationCount : "0";
	  let notificationsLastUpdate = JSON.parse(localStorage.getItem('home-feed-card-notificationsLastUpdate' + this.cacheId));
      if(this._hass){
        const filtered = Object.keys(this._hass.states).filter(key => key.startsWith("persistent_notification."));
      	let notificationCount = filtered.length;
      	if(notificationCount != oldNotificationCount || (this.moment && this.moment().diff(notificationsLastUpdate, 'minutes') > 5)){
      		this.notificationCount = notificationCount;
      		this.refreshNotifications().then(() => {});
      	}
      }
      
      window.setTimeout(
        () => this.notificationMonitor(),
        1000
      );
    }
    
    buildIfReady(){
    	if(!this._hass || !this.moment) return;
		let notificationsLastUpdate = JSON.parse(localStorage.getItem('home-feed-card-notificationsLastUpdate' + this.cacheId));
		
    	if((!this.loadedNotifications || !notificationsLastUpdate) && this.moment){
    		this.refreshNotifications().then(() => {});
    	}
        this._buildFeed();
    }
    
  	set hass(hass) {
		this._hass = hass;
		this.hass_version = hass.config.version;
		this._language = Object.keys(hass.resources)[0];
    	if(this.moment){
    		this.refreshEntityHistory().then(() => {});
    	}
		this.buildIfReady();
  	}
  	
  	getCardSize() {
    	return 2;
  	}
}

customElements.define("home-feed-card", HomeFeedCard);
customElements.define("home-feed-notification-popup", HomeFeedNotificationPopup);