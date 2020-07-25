import { LitElement, html, css } from "./lit-element.js";
import { closePopUp } from "card-tools/src/popup";

export class HomeFeedNotificationPopup extends LitElement {
	constructor() {
		super();
  	}
  	
	setConfig(config){
		this._notification = config.notification;
	}
	
	static get styles()
	{
		return css`
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
		`;
	}
	render() {
		setTimeout(() => {
			let root = this.shadowRoot;
			let card =root.querySelector("ha-card");
			
			let markdownElement = card && card.querySelector("ha-markdown").shadowRoot.querySelector("ha-markdown-element");
			if(markdownElement){
				markdownElement.querySelectorAll("a").forEach(link => {
  					link.addEventListener("click", closePopUp);
  				});
			}
		},100);
		
		return html`
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
   
	_handleDismiss(event) {
  		var id = event.target.notificationId;
    	this._hass.callService("persistent_notification", "dismiss", {
      		notification_id: id
    	});  
    	closePopUp();
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