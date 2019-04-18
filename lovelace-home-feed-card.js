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
    <ha-card id="card">
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
  		let data = this.entities.filter(i => i.multiple_items !== true).map(i => {
  		let stateObj = this._hass.states[i.entity];
  		return { ...stateObj, icon: ((i.icon) ? i.icon : stateObj.attributes.icon), display_name: ((i.name) ? i.name : stateObj.attributes.friendly_name), item_type: "entity",   };
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
   		var allItems = [].concat .apply([], await Promise.all([this.getNotifications(), this.getEvents(), this.getEntities(), this.getMultiItemEntities()]));
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
    				var contentText = n.message;
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
    					var contentText = `${n.display_name} @ ${n.state}`;
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
    				let start = moment(n.start);
    				let end = moment(n.end);
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
  	
  	set hass(hass) {
    	this._hass = hass;
    	let commands = Object.keys(this._hass.connection.commands).map(k => this._hass.connection.commands[k]);
    	let subscribed = commands.some(c => c.callback == this.subscriptionHandler || c.eventCallback == this.subscriptionHandler);
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
