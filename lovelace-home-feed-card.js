class HomeFeedCardHelpers{
	
	static get LitElement(){
		return Object.getPrototypeOf(customElements.get("home-assistant-main"));
	}
	static get html(){
		return HomeFeedCardHelpers.LitElement.prototype.html;
	}
}

class HomeFeedCard extends HomeFeedCardHelpers.LitElement {
    constructor() {
		super();
		
		this.pageId = location.pathname.replace(/\//g,"_");
		this.configuredScrollbars = false;
		this.loadedNotifications = false;
		this.refreshingNotifications = false;
		this.feedContent = null;
		this.loadModules();
  	}

	loadModules(){
		try{
			import("https://unpkg.com/moment@2.24.0/src/moment.js?module").then((module) => {
			this.moment = module.default;
			console.log("Loaded Moment module.");
			this.buildIfReady();
				});
			}
			catch(e){
				console.log("Error Loading Moment module", e.message);
				throw new Error("Error Loading Moment module" + e.message);
			}
		
		try{
			import("https://unpkg.com/custom-card-helpers@1.2.2/dist/index.m.js?module").then((module) => {
			this.helpers = module;
			console.log("Loaded custom-card-helpers module.");
			this.buildIfReady();
				});
			}
			catch(e){
				console.log("Error Loading custom-card-helpers module", e.message);
				throw new Error("Error Loading custom-card-helpers module" + e.message);
		}
		
	}
	
	createRenderRoot() {
		return this;
	}

	static get stylesheet() {
		return HomeFeedCardHelpers.html`
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
		if(!this._hass || !this.moment || !this.helpers){
			return HomeFeedCardHelpers.html``;
		} 
		else{
			if(this.feedContent != null){
				if(this.feedContent.length === 0 && this._config.show_empty === false){
					return HomeFeedCardHelpers.html``;
				}
				else{
				return HomeFeedCardHelpers.html`
				${HomeFeedCard.stylesheet}
				<ha-card id="card">
					${!this._config.title
					? HomeFeedCardHelpers.html``
					: HomeFeedCardHelpers.html`
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
				return HomeFeedCardHelpers.html``;
			}
		}
	}

    clearCache() {
    	localStorage.removeItem('home-feed-card-events' + this.pageId + this._config.title);
	 	localStorage.removeItem('home-feed-card-eventsLastUpdate' + this.pageId + this._config.title);
	 	localStorage.removeItem('home-feed-card-notifications' + this.pageId + this._config.title);
	 	localStorage.removeItem('home-feed-card-notificationsLastUpdate' + this.pageId + this._config.title);
	 	localStorage.removeItem('home-feed-card-history' + this.pageId + this._config.title);
	 	localStorage.removeItem('home-feed-card-historyLastUpdate' + this.pageId + this._config.title);
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
        		 	entityConf.exclude_states = ["unknown"];
        		 }
    		} else {
      			throw new Error(`Invalid entity specified at position ${index}.`);
    		}
			return entityConf;
  		});
	}
  
  computeStateDisplay(stateObj, entityConfig){
  	var state = entityConfig.state_map && entityConfig.state_map[stateObj.state] ? entityConfig.state_map[stateObj.state] : null;
  	
  	if(!state){
  		state = this.helpers.computeStateDisplay(this._hass.localize, stateObj);
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
  		if(!i.exclude_states.includes(stateObj.state))
  		{
  			return { ...stateObj, icon: this.getIcon(stateObj, i.icon), entity: i.entity, display_name: ((i.name) ? i.name : stateObj.attributes.friendly_name), format: (i.format != null ? i.format : "relative"), more_info_on_tap: i.more_info_on_tap, content_template: i.content_template, state: this.computeStateDisplay(stateObj, i), stateObj: stateObj, item_type: "entity",   };
	 	}
	 	else{
	 		return null;
	 	}
	 	});
	 	
	 	return data.filter(entity => entity != null);
	}
  
  applyTemplate(item, template){
  	var result = template;
  	Object.keys(item).forEach(p => {
  		result = result.replace("{{" + p + "}}", item[p]);
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
  			return stateObj.attributes[i.list_attribute].map(p => {
  				let created = (i.timestamp_property && p[i.timestamp_property]) ? p[i.timestamp_property] : stateObj.last_changed;
  				let timeStamp = isNaN(created) ? created : new Date(created * 1000);
  				return { ...stateObj, icon: icon, format: (i.format != null ? i.format : "relative"), entity: i.entity, display_name: this.applyTemplate(p, i.content_template), last_changed: timeStamp, stateObj: stateObj, item_type: "multi_entity",   };
  			}).slice(0, (i.max_items) ? i.max_items : 5);
  		});
	 	
	 	return [].concat.apply([], data);
	}
  
  getHistoryState(stateObj, item){
  	var newStateObj = {};
  	Object.assign(newStateObj, stateObj);
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
  	
  	let history = (await this._hass.callApi('get', 'history/period?filter_entity_id=' + entity_ids))
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
  	if(this._config.entities.length == 0) return;
  	
  	let entityHistory = await this.getLiveEntityHistory();
  	localStorage.setItem('home-feed-card-history' + this.pageId + this._config.title, JSON.stringify(entityHistory));
  	
	this.buildIfReady();
  }
  
  async getEvents() {
	if(!this.calendars || this.calendars.length == 0) return [];
	let lastUpdate = JSON.parse(localStorage.getItem('home-feed-card-eventsLastUpdate' + this.pageId + this._config.title));
	if(!lastUpdate || (this.moment && this.moment().diff(lastUpdate, 'minutes') > 15)) {
		const start = this.moment.utc().format("YYYY-MM-DDTHH:mm:ss");
    	const end = this.moment.utc().startOf('day').add(1, 'days').format("YYYY-MM-DDTHH:mm:ss");
		try{
			var calendars = await Promise.all(
        	this.calendars.map(
          		calendar => {
          			let url = `calendars/${calendar}?start=${start}Z&end=${end}Z`;
          			return this._hass.callApi('get', url);
          		  }));
        }
        catch(e){
        	console.error("Error getting calendar events");
        	var calendars = [];
        }
    	var events = [].concat.apply([], calendars);
        
    	var data = events.map(i => {
	 		return { ...i, format: "relative", item_type: "calendar_event" };
	 	});
	 	
	 	localStorage.setItem('home-feed-card-events' + this.pageId + this._config.title,JSON.stringify(data));
	 	localStorage.setItem('home-feed-card-eventsLastUpdate' + this.pageId + this._config.title,JSON.stringify(this.moment()));
	 	return data;
	 }
	 else{
	 	return JSON.parse(localStorage.getItem('home-feed-card-events' + this.pageId + this._config.title));
	 }
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
	 	return { ...i, format: "relative", item_type: "notification" };
	 });
	 localStorage.setItem('home-feed-card-notifications' + this.pageId + this._config.title,JSON.stringify(data));
	 
	 if(this.moment){
	 	localStorage.setItem('home-feed-card-notificationsLastUpdate' + this.pageId + this._config.title,JSON.stringify(this.moment()));
	 }
	 
	 this.refreshingNotifications = false;
	 this.loadedNotifications = true;
	 this.buildIfReady();
   }
   
   getNotifications() {
   	 if(!JSON.parse(localStorage.getItem('home-feed-card-notifications' + this.pageId + this._config.title))) return [];
   	 
     return JSON.parse(localStorage.getItem('home-feed-card-notifications' + this.pageId + this._config.title));
   }
   
   async getEntityHistoryItems() {
   	if(!JSON.parse(localStorage.getItem('home-feed-card-history' + this.pageId + this._config.title))) return [];
   	return JSON.parse(localStorage.getItem('home-feed-card-history' + this.pageId + this._config.title));
   }
   
   getItemTimestamp(item)
   {
		switch(item.item_type)
    		{
    			case "notification":
    				return item.created_at;
    			case "calendar_event":
    				return ((item.start.date) ? item.start.date : (item.start.dateTime) ? item.start.dateTime : item.start);
    			case "entity":
    			case "entity_history":
    			case "multi_entity":
    				if(item.attributes.device_class === "timestamp"){
    					return item.state;
    				}
    				else{
    					return (item.attributes.last_changed ? item.attributes.last_changed : item.last_changed);
    				}
    			default:
    				return new Date().toISOString();
    		}
   }
   
   
    		
   async getFeedItems(){
   		var allItems = [].concat .apply([], await Promise.all([this.getNotifications(), this.getEvents(), this.getEntities(), this.getMultiItemEntities(), this.getEntityHistoryItems()]));
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
  
  popUp(title, message, large=false) {
    let popup = document.createElement('div');
    popup.innerHTML = `
    <style>
      app-toolbar {
        color: var(--more-info-header-color);
        background-color: var(--more-info-header-background);
      }
    </style>
    <app-toolbar>
      <paper-icon-button
        icon="hass:close"
        dialog-dismiss=""
      ></paper-icon-button>
      <div class="main-title" main-title="">
        ${title}
      </div>
    </app-toolbar>
  `;
    popup.appendChild(message);
    this.moreInfo(Object.keys(this._hass.states)[0]);
    let moreInfo = document.querySelector("home-assistant")._moreInfoEl;
    moreInfo._page = "none";
    moreInfo.shadowRoot.appendChild(popup);
    moreInfo.large = large;
    //document.querySelector("home-assistant").provideHass(message);

    setTimeout(() => {
      let interval = setInterval(() => {
        if (moreInfo.getAttribute('aria-hidden')) {
          popup.parentNode.removeChild(popup);
          clearInterval(interval);
        }
      }, 100)
    }, 1000);
  return moreInfo;
  }
  
  closePopUp() {
    let moreInfo = document.querySelector("home-assistant")._moreInfoEl;
    if (moreInfo) moreInfo.close()
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
  			let popup = this.helpers.createThing(config);
  			
  			popup.hass = mock_hass;
   			
   			
   			 
   			setTimeout(()=>{
   				popup.shadowRoot.querySelector('ha-card #states')
   				.querySelectorAll("div")[1]
   				.querySelector("hui-history-graph-card")
   				.shadowRoot
   				.querySelector('ha-card')
   				.style.boxShadow = 'none';
   			},100);
   			
  			
   			this.popUp(item.display_name, popup);
  		}
  		else
  		{
  			this.helpers.handleClick(this, this._hass, {"entity":item.entity_id, 
   				"tap_action":{"action":"more-info"}}, false, false); 
   		}
	}
	
	_buildFeed() {
    	if(!this._hass) return;
		
		var feedContent = [];
		
    	this.getFeedItems().then(items =>
	  	{
	  		if(this._config.max_item_count) items.splice(this._config.max_item_count);
	  		this.feedContent = items;
			this.requestUpdate();
  		}
		);
	}
	
	_renderItem(n) {
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
				var contentText = ((n.summary) ? n.summary : n.title);
				break;
			case "entity":
			case "entity_history":
				var icon = n.icon;
				
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
			default:
				var icon = "mdi:bell";
				var contentText = "Unknown Item Type";
		}
		
			
		if(!n.stateObj && !icon){ 
			icon = "mdi:bell";
		}
		
		var clickable = false;
		var contentClass = '';

		if(n.item_type == "entity" || n.item_type == "entity_history"){
			let more_info_on_tap = (typeof n.more_info_on_tap !== 'undefined') ? n.more_info_on_tap 
				: this._config.more_info_on_tap;
			
			if(more_info_on_tap){
				
				contentClass = "state-card-dialog";
				clickable = true;
			}
		}
		
		
		
		var allDay = false;
		if(n.item_type == "calendar_event"){
			
			if(n.start.date){
				allDay = true;
			}
			else if(n.start.dateTime){
				allDay = false;	
			}
			else{
				let start = this.moment(n.start);
				let end = this.moment(n.end);
				let diffInHours = end.diff(start, 'hours');
				allDay = (diffInHours >= 24);
			}
		}
		var timeItem;

		if(allDay){
			
			if(n.start.date && this.moment(n.start.date) > this.moment().startOf('day')){
				var timeString = "Tomorrow";
			}
			else{
				var timeString = "Today";
			}
			timeItem = HomeFeedCardHelpers.html`<div style="display:block; clear:both;">${timeString}</div>`;
		}
		else
		{
			if(n.timeDifference.abs < 60 && n.format == "relative") {
				// Time difference less than 1 minute, so use a regular div tag with fixed text.
				// This avoids the time display refreshing too often shortly before or after an item's timestamp
				let timeString = n.timeDifference.sign == 0 ? "now" : n.timeDifference.sign == 1 ? "Less than 1 minute ago" : "In less than 1 minute";
				timeItem = HomeFeedCardHelpers.html`<div style="display:block; clear:both;" title="${new Date(n.timestamp)}">${timeString}</div>`;
			}
			else {
				// Time difference creater than or equal to 1 minute, so use hui-timestamp-display in relative mode
				timeItem = HomeFeedCardHelpers.html`<hui-timestamp-display
									style="display:block; clear:both;"
									.hass="${this._hass}"
									.ts="${new Date(n.timestamp)}"
									.format="${n.format}"
									title="${new Date(n.timestamp)}"
								></hui-timestamp-display>
              				`;
			}
		}
		
		

		if(n.item_type == "notification"){
			var closeLink = HomeFeedCardHelpers.html`<ha-icon icon='mdi:close' .notificationId='${n.notification_id}' @click=${this._handleDismiss}</ha-icon>`;
		}
		else{
			var closeLink = HomeFeedCardHelpers.html``;
		}
		
		let stateObj = n.stateObj ? n.stateObj : {"entity_id": "", "state": "unknown", "attributes":{}};

		return HomeFeedCardHelpers.html`
		<div class="item-container">
			<div class="item-left">
				<state-badge .stateObj='${stateObj}' .overrideIcon='${icon}'/>
			</div>
			<div class="item-right">
				${closeLink}
			</div>
			<div class="item-content ${contentClass}" .item=${n} @click=${clickable ? this._handleClick : null}>
				<ha-markdown class="markdown-content" style="float:left" .content=${contentText}></ha-markdown>
				${timeItem}
			</div>
		</div>
		<hr style="clear:both;"/>
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
	  let notificationsLastUpdate = JSON.parse(localStorage.getItem('home-feed-card-notificationsLastUpdate' + this.pageId + this._config.title));
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
    	if(!this._hass || !this.moment || !this.helpers) return;
		let notificationsLastUpdate = JSON.parse(localStorage.getItem('home-feed-card-notificationsLastUpdate' + this.pageId + this._config.title));
		
    	if((!this.loadedNotifications || !notificationsLastUpdate) && this.moment){
    		this.refreshNotifications().then(() => {});
    	}
        this._buildFeed();
    }
    
  	set hass(hass) {
		this._hass = hass;
    	if(this.moment && this.helpers && this._config.entities){
    		this.refreshEntityHistory().then(() => {});
    	}
		this.buildIfReady();
  	}
  	
  	getCardSize() {
    	return 2;
  	}
}

customElements.define("home-feed-card", HomeFeedCard);
