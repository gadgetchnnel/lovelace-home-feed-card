class HomeFeedCard extends Polymer.Element {
    constructor() {
    	super();
		this.pageId = location.pathname.replace(/\//g,"_");
		this.loadedNotifications = false;
		this.refreshingNotifications = false;
		this.loadModules();
    	this.loadFromCache();
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

    static get template(){
    	return Polymer.html`
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
	</style>
    <ha-card id="card">
        <div id="header" class="header"></div>
    	<div id="notifications"></div>
    </ha-card>
    `;
    }
    
    loadFromCache() {
    	this.events = JSON.parse(localStorage.getItem('home-feed-card-events' + this.pageId));
	 	this.lastUpdate = JSON.parse(localStorage.getItem('home-feed-card-eventsLastUpdate' + this.pageId));
	 	this.notifications = JSON.parse(localStorage.getItem('home-feed-card-notifications' + this.pageId));
	 	this.notificationsLastUpdate = JSON.parse(localStorage.getItem('home-feed-card-notificationsLastUpdate' + this.pageId));
    }
    
    clearCache() {
    	localStorage.removeItem('home-feed-card-events' + this.pageId);
	 	localStorage.removeItem('home-feed-card-eventsLastUpdate' + this.pageId);
	 	localStorage.removeItem('home-feed-card-notifications' + this.pageId);
	 	localStorage.removeItem('home-feed-card-notificationsLastUpdate' + this.pageId);
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
			if (
      			typeof entityConf === "object" &&
      			!Array.isArray(entityConf) &&
      			entityConf.type
    			)
    		{
      			return entityConf;
    		}
			if (typeof entityConf === "string") {
      			entityConf = { entity: entityConf };
    		} else if (typeof entityConf === "object" && !Array.isArray(entityConf)) {
      			if (!entityConf.entity) {
        			throw new Error(
          				`Entity object at position ${index} is missing entity field.`
        			);
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
  
  getEntities() {
  		let data = this.entities.filter(i => i.multiple_items !== true && i.include_history !== true).map(i => {
  		let stateObj = this._hass.states[i.entity];
  		return { ...stateObj, icon: ((i.icon) ? i.icon : stateObj.attributes.icon), display_name: ((i.name) ? i.name : stateObj.attributes.friendly_name), content_template: i.content_template, state: this.computeStateDisplay(stateObj, i), item_type: "entity",   };
	 	});
	 	
	 	return data;
	}
  
  applyTemplate(item, template){
  	var result = template;
  	//console.log(result);
  	Object.keys(item).forEach(p => {
  		result = result.replace("{{" + p + "}}", item[p]);
  		//console.log(p, result);
  	});
  	
  	if(item.attributes)
  	{
  		Object.keys(item.attributes).forEach(p => {
  			result = result.replace("{{" + p + "}}", item.attributes[p]);
  			//console.log(p, result);
  		});
  	}
  	
  	return result;
  }
  
  getMultiItemEntities() {
  		let data = this.entities.filter(i => i.multiple_items === true && i.list_attribute && i.content_template).map(i =>{
  			let stateObj = this._hass.states[i.entity];
  			return stateObj.attributes[i.list_attribute].map(p => {
  				let created = (i.timestamp_property && p[i.timestamp_property]) ? p[i.timestamp_property] : stateObj.last_changed;
  				let timeStamp = isNaN(created) ? created : new Date(created * 1000);
  				return { ...stateObj, icon: ((i.icon) ? i.icon : stateObj.attributes.icon), display_name: this.applyTemplate(p, i.content_template), last_changed: timeStamp, item_type: "multi_entity",   };
  			}).slice(0, (i.max_items) ? i.max_items : 5);
  		});
	 	
	 	return [].concat.apply([], data);
	}
  
  async getEntityHistoryItems() {
  	var entity_ids = this.entities.filter(i => i.include_history == true).map(i => i.entity).join();
  	let history = (await this._hass.callApi('get', 'history/period?filter_entity_id=' + entity_ids));
  	history = history.map(arr => {
  				let entityConfig = this.entities.find(entity => entity.entity == arr[0].entity_id);
  				let remove_repeats = entityConfig.remove_repeats !== false;
  				
  				return arr.filter(i => i.state != "unknown")
  			  			  .filter((item,index,arr) => {return !arr[index-1] || item.state != arr[index-1].state || remove_repeats == false })
  			  			  .reverse()
  			  			  .slice(0,entityConfig.max_history ? entityConfig.max_history : 3)
  			  			  .map(i => {
  			  			  	return { ...i, icon: ((entityConfig.icon) ? entityConfig.icon : (i.attributes ? i.attributes.icon : null)), display_name: ((entityConfig.name) ? entityConfig.name : i.attributes.friendly_name), content_template: entityConfig.content_template, state: this.computeStateDisplay(i,entityConfig), item_type: "entity",   };
  			  			  });
  			  	 });
  	let data = [].concat.apply([], history);
  		
	return data;
  }
  
  async getEvents() {
	if(!this.calendars || this.calendars.length == 0) return [];
	
	if(!this.lastUpdate || (this.moment && this.moment().diff(this.lastUpdate, 'minutes') > 15)) {
		const start = this.moment.utc().format("YYYY-MM-DDTHH:mm:ss");
    	const end = this.moment.utc().startOf('day').add(1, 'days').format("YYYY-MM-DDTHH:mm:ss");
		try{
			var calendars = await Promise.all(
        	this.calendars.map(
          		calendar => {
          			let url = `calendars/${calendar}?start=${start}Z&end=${end}Z`;
          			console.log("Calendar URL",url);
          			return this._hass.callApi('get', url);
          		  }));
        }
        catch(e){
        	console.error("Error getting calendar events");
        	var calendars = [];
        }
    	var events = [].concat.apply([], calendars);
        
    	var data = events.map(i => {
	 		return { ...i, item_type: "calendar_event" };
	 	});
	 	
	 	this.events = data;
	 	this.lastUpdate = this.moment();
	 	localStorage.setItem('home-feed-card-events' + this.pageId,JSON.stringify(this.events));
	 	localStorage.setItem('home-feed-card-eventsLastUpdate' + this.pageId,JSON.stringify(this.lastUpdate));
	 	return data;
	 }
	 else{
	 	return this.events;
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
	 	return { ...i, item_type: "notification" };
	 });
	 this.notifications = data;
	 localStorage.setItem('home-feed-card-notifications' + this.pageId,JSON.stringify(this.notifications));
	 
	 if(this.moment){
	 	this.notificationsLastUpdate = this.moment();
	 	localStorage.setItem('home-feed-card-notificationsLastUpdate' + this.pageId,JSON.stringify(this.notificationsLastUpdate));
	 }
	 
	 this.refreshingNotifications = false;
	 this.loadedNotifications = true;
	 this.buildIfReady();
   }
   
   getNotifications() {
   	 if(!this.notifications) return [];
   	 
     return this.notifications;
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
   var id = event.target.dataset.notificationId;
    this._hass.callService("persistent_notification", "dismiss", {
      notification_id: id
    });   
  }
  
  	_build() {
    	if(!this.$){
    		return;
    	}
    	
    	const header = this.$.header;
    	
    	if(this._config.title) {
      		if(header.children.length == 0) {
      			let div = document.createElement("div");
    			div.classList.add("name");
    			div.innerText = this._config.title;
    			header.appendChild(div);
    		}
      	}
      	else {
      		if(header.parentNode){
      			header.parentNode.removeChild(header);
      		}
      	}
    	
    	if(!this._hass) return;
    	
    		this.getFeedItems().then(items =>
	  	{
	  		if(items.length === 0 && this._config.show_empty === false){
	  		this.$.card.style.display = "none";
	  			return;
	  		}
	  		
	  		this.$.card.style.display = "";
	  		
	  		const root = this.$.notifications;
	  		
	  		if(this._config.scrollbars_enabled !== false || this._config.max_height){
	  			root.style.maxHeight = this._config.max_height ? this._config.max_height : "28em";
	  			root.style.overflow = this._config.scrollbars_enabled !== false ? "auto" : "hidden";
  			}
  			
  			if(this._config.max_item_count) items.splice(this._config.max_item_count);
  			
    		while(root.lastChild) root.removeChild(root.lastChild);
    		items.forEach((n) => {
    		
    		let itemContainer = document.createElement("div");
    		itemContainer.classList.add("item-container");
    		
    		let itemLeft = document.createElement("div");
    		itemLeft.classList.add("item-left");
    		
    		let itemContent = document.createElement("div");
    		itemContent.classList.add("item-content");
    		
    		let itemRight = document.createElement("div");
    		itemRight.classList.add("item-right");
    		
    		itemContainer.appendChild(itemLeft);
    		itemContainer.appendChild(itemRight);
    		itemContainer.appendChild(itemContent);
    		
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
    				if(n.icon)
    				{
    					var icon = n.icon;
    				}
    				
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
    					if(!icon) var icon = "mdi:bell";
    				}
    				break;
    			case "multi_entity":
    				if(n.icon)
    				{
    					var icon = n.icon;
    				}
    				
    				var contentText = `${n.display_name}`;
    				if(!icon) var icon = "mdi:bell";
    				break;
    			default:
    				var icon = "mdi:bell";
    				var contentText = "Unknown Item Type";
    		}
    		
    		let iconElement = document.createElement("ha-icon");
    		iconElement.icon = icon;
    		itemLeft.appendChild(iconElement);
    		
    		let contentItem = document.createElement("ha-markdown");
    		contentItem.content = `${contentText}`;
    		//contentItem.style.cssFloat = "left";
    		contentItem.classList.add("markdown-content");
    		itemContent.appendChild(contentItem);
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
    		
    		if(allDay){
    			let timeItem = document.createElement("div");
    			timeItem.innerText = "Today";
    			timeItem.style.display = "block";
    			itemContent.appendChild(timeItem);
    		}
    		else
    		{
    			if(n.timeDifference.abs < 60) {
					// Time difference less than 1 minute, so use a regular div tag with fixed text.
					// This avoids the time display refreshing too often shortly before or after an item's timestamp
    				let timeItem = document.createElement("div");
    				timeItem.innerText = n.timeDifference.sign == 0 ? "now" : n.timeDifference.sign == 1 ? "Less than 1 minute ago" : "In less than 1 minute";
    				timeItem.title = new Date(n.timestamp);
    				timeItem.style.display = "block";
    				itemContent.appendChild(timeItem);
    			}
    			else {
    				// Time difference creater than or equal to 1 minute, so use hui-timestamp-display in relative mode
    				let timeItem = document.createElement("hui-timestamp-display");
    				timeItem.hass = this._hass;
    				timeItem.ts = new Date(n.timestamp);
    				timeItem.format = "relative";
    				timeItem.title = new Date(n.timestamp);
    				timeItem.style.display = "block";
    				itemContent.appendChild(timeItem);
    			}
    		}
    		if(n.item_type == "notification"){
    			//let closeLink = document.createElement("a");
    			//closeLink.href = "#";
    			//closeLink.addEventListener("click", (e) => this._handleDismiss(e));
    			//closeLink.dataset.notificationId = n.notification_id;
    			let closeIcon = document.createElement("ha-icon");
    			closeIcon.addEventListener("click", (e) => this._handleDismiss(e));
    			closeIcon.icon = "mdi:close";
    			closeIcon.dataset.notificationId = n.notification_id;
    			//closeLink.appendChild(closeIcon);
    			//itemRight.appendChild(closeLink);
    			itemRight.appendChild(closeIcon);
    		}
    		root.appendChild(itemContainer);
    		let hr = document.createElement("hr");
    		hr.style.clear = "both";
    		root.appendChild(hr);
    	});
  		}
  	  );
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
      if(this._hass){
        const filtered = Object.keys(this._hass.states).filter(key => key.startsWith("persistent_notification."));
      	let notificationCount = filtered.length;
      	
      	if(notificationCount != oldNotificationCount || (this.moment && this.moment().diff(this.notificationsLastUpdate, 'minutes') > 5)){
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
    	
    	if((!this.loadedNotifications || !this.notificationsLastUpdate) && this.moment){
    		this.refreshNotifications().then(() => {});
    	}
        this._build();
    }
    
  	set hass(hass) {
    	this._hass = hass;
    	this.buildIfReady();
  	}
  	
  	getCardSize() {
    	return 2;
  	}
}

customElements.define("home-feed-card", HomeFeedCard);