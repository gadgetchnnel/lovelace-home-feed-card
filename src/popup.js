import { LitElement, html, css } from "./lit-element.js";

export class HomeFeedNotificationPopup extends LitElement {
	constructor() {
		super();
		this.pushStateInterceptor();
		console.log("HomeFeedNotificationPopup Constructor");	
  	}
  	
  	createRenderRoot() {
		return this;
	}
	
	set notification(notification) {
		this._notification = notification;
	}
	
	pushStateInterceptor()
	{
		(function(history){
    		var pushState = history.pushState;
   		 	history.pushState = function(state) {
        		if (typeof history.onpushstate == "function") {
            		history.onpushstate({state: state});
        		}
        		return pushState.apply(history, arguments);
    		};
		})(window.history);
	}
	
	render() {
		return html`
			<style type="text/css">
				.contents {
        			padding: 16px;
        			-ms-user-select: text;
        			-webkit-user-select: text;
        			-moz-user-select: text;
        			user-select: text;
      			}
      			
      			ha-markdown {
        			overflow-wrap: break-word;
      			}
      			
      			ha-markdown img {
                  max-width: 100%;
                }
                
      			a {
        			color: var(--primary-color);
      			}
      
	 			.time {
        			display: flex;
        			justify-content: flex-end;
        			margin-top: 6px;
      			}
      			
      			ha-relative-time {
        			color: var(--secondary-text-color);
      			}
      			
      			.actions {
        			border-top: 1px solid #e8e8e8;
        			padding: 5px 16px;
      			}
			</style>
			<ha-card>
				<div class="contents">
					<ha-markdown .hass="${this._hass}" .content="${this._notification.message}"></ha-markdown>
					<div class="time">
          				<span>
            				<ha-relative-time .hass="${this._hass}" .datetime="${this._notification.created_at}"></ha-relative-time>
          				</span>
        			</div>
        			<div class="actions">
        				<mwc-button .notificationId='${this._notification.notification_id}' @click=${this._handleDismiss}>Dismiss</mwc-button>
        			</div>
				</div>
			</ha-card>
		`;
	}
	closePopUp() {
    let moreInfo = document.querySelector("home-assistant")._moreInfoEl;
    if (moreInfo && moreInfo.style.display != "none") {
    	moreInfo.close();
    	history.onpushstate = null;
    }
   }
   
	_handleDismiss(event) {
  		var id = event.target.notificationId;
    	this._hass.callService("persistent_notification", "dismiss", {
      		notification_id: id
    	});  
    	this.closePopUp(); 
   }
   
	_computeTooltip(hass, notification) {
    	if (!hass || !notification) {
      		return undefined;
    	}
	
    	const d = new Date(notification.created_at);
    	return d.toLocaleDateString(hass.language, {
      		year: "numeric",
      		month: "short",
      		day: "numeric",
      		minute: "numeric",
      		hour: "numeric",
    	});
  	}
	
	set hass(hass) {
		this._hass = hass;
	}
	
	
}