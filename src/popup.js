import { LitElement, html, css } from "./lit-element.js";

import { fireEvent } from "card-tools/src/event";
import { provideHass } from "card-tools/src/hass";
import { createCard } from "card-tools/src/lovelace-element";
import "card-tools/src/lovelace-element";

export function closePopUp() {
  const root = document.querySelector("hc-main") || document.querySelector("home-assistant");
  const moreInfoEl = root && root._moreInfoEl;
  if(moreInfoEl)
    moreInfoEl.close();
}

export function popUp(title, content, large=false, style=null, fullscreen=false) {
  const root = document.querySelector("hc-main") || document.querySelector("home-assistant");
  // Force _moreInfoEl to be loaded
  fireEvent("hass-more-info", {entityId: null}, root);
  const moreInfoEl = root._moreInfoEl;
  // Close and reopen to clear any previous styling
  // Necessary for popups from popups
  moreInfoEl.close();
  moreInfoEl.open();

  const oldContent = moreInfoEl.shadowRoot.querySelector("more-info-controls");
  if(oldContent) oldContent.style['display'] = 'none';

  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
  <style>
    app-toolbar {
      color: var(--more-info-header-color);
      background-color: var(--more-info-header-background);
    }
    .scrollable {
      overflow: auto;
      max-width: 100% !important;
    }
  </style>
  ${fullscreen
    ? ``
    : `
      <app-toolbar>
        <ha-icon-button
          icon="hass:close"
          dialog-dismiss=""
          aria-label="Dismiss dialog"
        ></ha-icon-button>
        <div class="main-title" main-title="">
          ${title}
        </div>
      </app-toolbar>
      `
    }
    <div class="scrollable">
    </div>
  `;

  const scroll = wrapper.querySelector(".scrollable");
  scroll.appendChild(content);

  moreInfoEl.sizingTarget = scroll;
  moreInfoEl.large = large;
  moreInfoEl._page = "none"; // Display nothing by default
  moreInfoEl.shadowRoot.appendChild(wrapper);

  let oldStyle = {};
  if(style) {
    moreInfoEl.resetFit(); // Reset positioning to enable setting it via css
    for (var k in style) {
      oldStyle[k] = moreInfoEl.style[k];
      moreInfoEl.style.setProperty(k, style[k]);
    }
  }

  moreInfoEl._dialogOpenChanged = function(newVal) {
    if (!newVal) {
      if(this.stateObj)
        this.fire("hass-more-info", {entityId: null});

      if (this.shadowRoot == wrapper.parentNode) {
        this._page = null;
        this.shadowRoot.removeChild(wrapper);

        const oldContent = this.shadowRoot.querySelector("more-info-controls");
        if(oldContent) oldContent.style['display'] = "inline";

        if(style) {
          moreInfoEl.resetFit();
          for (var k in oldStyle)
            if (oldStyle[k])
              moreInfoEl.style.setProperty(k, oldStyle[k]);
            else
              moreInfoEl.style.removeProperty(k);
        }
      }
    }
  }

  return moreInfoEl;
}

export class HomeFeedNotificationPopup extends LitElement {
	constructor() {
		super();
		this.pushStateInterceptor();
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