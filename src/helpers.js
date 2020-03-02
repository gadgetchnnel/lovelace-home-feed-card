export class HomeFeedCardHelpers{
	
	static get LitElement(){
		console.log("Getting LitElement");
		return Object.getPrototypeOf(customElements.get("hui-view"));
	}
	static get html(){
		return HomeFeedCardHelpers.LitElement.prototype.html;
	}
}