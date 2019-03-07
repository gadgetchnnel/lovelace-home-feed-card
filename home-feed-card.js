class HomeFeedCard extends Polymer.Element {
    constructor() {
    	super();
    	this.pageId = location.pathname.replace(/\//g,"_");
    	this.loadFromCache();
	 	this.registerHandlers();
  	}
	
    static get template(){
    	return Polymer.html`
    <style>
    	ha-card {
  			padding: 0 16px 16px 16px;
  			max-height: 30em;
  			overflow: auto;
		}
		#notifications {
			margin: -4px 0;
			/*padding-top: 2em;*/
		}
		#notifications > * {
			margin: 8px 0;
		}

		#notifications > div > * {
			overflow: hidden;
			padding-right: 1em;
		}

		.header {
  			font-family: var(--paper-font-headline_-_font-family); -webkit-font-smoothing: var(--paper-font-headline_-_-webkit-font-smoothing); font-size: var(--paper-font-headline_-_font-size); font-weight: var(--paper-font-headline_-_font-weight); letter-spacing: var(--paper-font-headline_-_letter-spacing); line-height: var(--paper-font-headline_-_line-height);
  			line-height: 30px;
			color: var(--primary-text-color);
          	padding: 28px 0 12px;
          	display: flex;
          	justify-content: space-between;
          	position: -webkit-sticky;
          	position: sticky;
          	top: 0;
          	z-index: 999;
          	width: 100%;
          	background: var(--ha-card-background, var(--paper-card-background-color, white));
          	opacity: 1.0;
		}
		.header .name {
			white-space: var(--paper-font-common-nowrap_-_white-space); overflow: var(--paper-font-common-nowrap_-_overflow); text-overflow: var(--paper-font-common-nowrap_-_text-overflow);
		}

		.state-card-dialog {
			cursor: pointer;
		}
	</style>
    <ha-card>
        <div id="header" class="header"></div>
    	<div id="notifications"></div>
    </ha-card>
    `;
    }
    
    registerHandlers() {
    	this.subscriptionHandler = () => {
    		console.info(`%cRefreshing persistent_notifications`, "color: green; font-weight: bold", "");
    		this.refreshNotifications().then(() => {});
    	}
    }
    
    loadFromCache() {
    	this.events = JSON.parse(localStorage.getItem('home-feed-card-events' + this.pageId));
	 	this.lastUpdate = JSON.parse(localStorage.getItem('home-feed-card-eventsLastUpdate' + this.pageId));
	 	this.notifications = JSON.parse(localStorage.getItem('home-feed-card-notifications' + this.pageId));
    }
    
    setConfig(config) {
      if(!config)
      	throw new Error("Invalid configuration");
      this._config = config;
      this.entities = this.processConfigEntities(this._config.entities);
      this.calendars = this._config.calendars;
      setTimeout(() => this._build(), 10);
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
	
  getEntities() {
  		let data = this.entities.map(i => {
  		let stateObj = this._hass.states[i.entity];
	 	return { ...stateObj, display_name: ((i.name) ? i.name : stateObj.attributes.friendly_name), item_type: "entity",   };
	 	});
	 	
	 	return data;
	} 
  
  async getEvents() {
	if(!this.calendars || this.calendars.length == 0) return [];
	
	if(!this.lastUpdate || moment().diff(this.lastUpdate, 'minutes') > 15) {
		const start = moment().format("YYYY-MM-DDTHH:mm:ss");
    	const end = moment().startOf('day').add(1, 'days').format("YYYY-MM-DDTHH:mm:ss");
		var calendars = await Promise.all(
        	this.calendars.map(
          		calendar => {
          			let url = `calendars/${calendar}?start=${start}Z&end=${end}Z`;
          			return this._hass.callApi('get', url);
          		  }));
    	var events = [].concat.apply([], calendars);
    
    	var data = events.map(i => {
	 		return { ...i, item_type: "calendar_event" };
	 	});
	 	
	 	this.events = data;
	 	this.lastUpdate = moment();
	 	localStorage.setItem('home-feed-card-events' + this.pageId,JSON.stringify(this.events));
	 	localStorage.setItem('home-feed-card-eventsLastUpdate' + this.pageId,JSON.stringify(this.lastUpdate));
	 	return data;
	 }
	 else{
	 	return this.events;
	 }
  }
  
   async refreshNotifications() {
     var response = await this._hass.callWS({type: 'persistent_notification/get'});
     if(this._config.id_filter) {
		response = response.filter(n => n.notification_id.match(this._config.id_filter));
	 }
	 let data = response.map(i => {
	 	return { ...i, item_type: "notification" };
	 });
	 this.notifications = data;
	 
	 localStorage.setItem('home-feed-card-notifications' + this.pageId,JSON.stringify(this.notifications));
	 
	 this._build();
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
    				return item.start.dateTime;
    			case "entity":
    				if(item.attributes.device_class === "timestamp"){
    					return item.state;
    				}
    				else{
    					return item.last_changed;
    				}
    			default:
    				return new Date().toISOString();
    		}
   }
   
   
    		
   async getFeedItems(){
   		var allItems = [].concat .apply([], await Promise.all([this.getNotifications(), this.getEvents(), this.getEntities()]));
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
    this._hass.callService("persistent_notification", "dismiss", {
      notification_id: event.target.parentElement.dataset.notificationId
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
	  		const root = this.$.notifications;
    		while(root.lastChild) root.removeChild(root.lastChild);
    		items.forEach((n) => {
    		
    		let outerDiv = document.createElement("div");
    		
    		let innerDiv = document.createElement("div");
    		
    		let tab = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
    		
    		switch(n.item_type)
    		{
    			case "notification":
    				var icon = "mdi:bell";
    				var contentText = n.message;
    				break;
    			case "calendar_event":
    				var icon = "mdi:calendar";
    				var contentText = n.summary;
    				break;
    			case "entity":
    				if(n.attributes.device_class === "timestamp"){
    					var contentText = `${n.display_name}`;
    					var icon = "mdi:clock-outline";
    				}
    				else{
    					var contentText = `${n.display_name} @ ${n.state}`;
    					var icon = "mdi:bell";
    				}
    				
    				break;
    			default:
    				var icon = "mdi:bell";
    				var contentText = "Unknown Item Type";
    		}
    		
    		let contentDiv = document.createElement("div");
    		contentDiv.style.clear = "both";
    		
    		let iconElement = document.createElement("ha-icon");
    		iconElement.icon = icon;
    		iconElement.style.cssFloat = "left";
    	    contentDiv.appendChild(iconElement);
    		
    		let contentItem = document.createElement("ha-markdown");
    		contentItem.content = `${contentText}`;
    		contentItem.style.cssFloat = "left";
    		contentDiv.appendChild(contentItem);
    		let clearDiv = document.createElement("div");
    		clearDiv.style.clear = "both";
    		
    		
    		innerDiv.appendChild(contentDiv);
    		innerDiv.appendChild(clearDiv);
    		if(n.timeDifference.abs < 60) {
				// Time difference less than 1 minute, so use a regular div tag with fixed text.
				// This avoids the time display refreshing too often shortly before or after an item's timestamp
    			let timeItem = document.createElement("div");
    			timeItem.innerText = n.timeDifference.sign == 0 ? "now" : n.timeDifference.sign == 1 ? "Less than 1 minute ago" : "In less than 1 minute";
    			timeItem.style.display = "block";
    			innerDiv.appendChild(timeItem);
    		}
    		else {
    			// Time difference creater than or equal to 1 minute, so use hui-timestamp-display in relative mode
    			let timeItem = document.createElement("hui-timestamp-display");
    			timeItem.hass = this._hass;
    			timeItem.ts = new Date(n.timestamp);
    			timeItem.format = "relative";
    			timeItem.style.display = "block";
    			innerDiv.appendChild(timeItem);
    		}
    		outerDiv.appendChild(innerDiv);
    		
    		if(n.item_type == "notification"){
    			innerDiv.style.cssFloat = "left";
    			let closeDiv = document.createElement("div");
    			closeDiv.style.cssFloat = "right";
    			let closeLink = document.createElement("a");
    			closeLink.href = "#";
    			closeLink.addEventListener("click", (e) => this._handleDismiss(e));
    			closeLink.dataset.notificationId = n.notification_id;
    			let closeIcon = document.createElement("ha-icon");
    			closeIcon.icon = "mdi:close";
    			closeLink.appendChild(closeIcon);
    			closeDiv.appendChild(closeLink);
    			outerDiv.appendChild(closeDiv);
    		}
    		
    		let hr = document.createElement("hr");
    		hr.style.clear = "both";
    		outerDiv.appendChild(hr);
    		
    		root.appendChild(outerDiv);
    	});
  		}
  	  );
  	}
  	
  	set hass(hass) {
    	this._hass = hass;
    	
    	let commands = Object.keys(this._hass.connection.commands).map(k => this._hass.connection.commands[k]);
    	let subscribed = commands.some(c => c.eventType == "persistent_notifications_updated" && c.eventCallback == this.subscriptionHandler);
    	
    	if(!subscribed){
    		this._subscribed = true;
    	    this.refreshNotifications().then(() => {});
    	    
    	    console.info(`%cSubscribing to persistent_notification updates`, "color: green; font-weight: bold", "");
    	    this._hass.connection.subscribeEvents(this.subscriptionHandler, "persistent_notifications_updated");
    	}
    	
        this._build();
  	}
  	
  	getCardSize() {
    	return 2;
  	}
}

customElements.define("home-feed-card", HomeFeedCard);
