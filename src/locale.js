require('moment/locale/af');
require('moment/locale/ar');
require('moment/locale/bg');
require('moment/locale/bs');
require('moment/locale/ca');
require('moment/locale/cs');
require('moment/locale/cy');
require('moment/locale/da');
require('moment/locale/de');
require('moment/locale/de-ch');
require('moment/locale/el');
require('moment/locale/en-au');
require('moment/locale/en-ca');
require('moment/locale/en-gb');
require('moment/locale/en-ie');
require('moment/locale/en-il');
require('moment/locale/en-nz');
require('moment/locale/en-SG');
require('moment/locale/eo');
require('moment/locale/es');
require('moment/locale/et');
require('moment/locale/eu');
require('moment/locale/fa');
require('moment/locale/fi');
require('moment/locale/fr-ca');
require('moment/locale/fr-ch');
require('moment/locale/fr');
require('moment/locale/he');
require('moment/locale/hi');
require('moment/locale/hr');
require('moment/locale/hu');
require('moment/locale/hy-am');
require('moment/locale/id');
require('moment/locale/is');
require('moment/locale/it');
require('moment/locale/ja');
require('moment/locale/ko');
require('moment/locale/lb');
require('moment/locale/lt');
require('moment/locale/lv');
require('moment/locale/nb');
require('moment/locale/nl');
require('moment/locale/pl');
require('moment/locale/pt-BR');
require('moment/locale/pt');
require('moment/locale/ro');
require('moment/locale/ru');
require('moment/locale/sk');
require('moment/locale/sl');
require('moment/locale/sr');
require('moment/locale/sv');
require('moment/locale/ta');
require('moment/locale/te');
require('moment/locale/th');
require('moment/locale/tr');
require('moment/locale/uk');
require('moment/locale/ur');
require('moment/locale/vi');
require('moment/locale/zh-cn');
require('moment/locale/zh-hk');
require('moment/locale/zh-tw');

export const getCalendarString = function(date){
	var timeString = date.calendar();
	switch(date.locale())
	{
		case "ca":
		case "de":
		case "de-ch":
		case "es":
			timeString = timeString.replace(` ${date.format("LT")}`, "");
			timeString = timeString.substring(0, timeString.lastIndexOf(" ", timeString.lastIndexOf(" ")-1));
			break;
		case "et":
		case "hi":
		case "ta":
		case "te":
			timeString = timeString.replace(` ${date.format("LT")}`, "");
			timeString = timeString.replace(",","");
			break;
		case "eu":
		case "hu":
		case "zh-cn":
		case "zh-hk":
			timeString = timeString.replace(`${date.format("LT")}`, "");
			if(timeString.includes(" ")){
				timeString = timeString.substring(0, timeString.lastIndexOf(" "));
			}
			break;
		case "hy-am":
		case "ar":
			timeString = timeString.replace(` ${date.format("LT")}`, "");
			if(timeString.includes(" ")){
				timeString = timeString.substring(0, timeString.lastIndexOf(" ", timeString.lastIndexOf(" ")-1));
			}
			break;
		case "ja":
		case "ko":
		case "lt":
		case "sv":
			timeString = timeString.replace(` ${date.format("LT")}`, "");
			break;
		default:
			timeString = timeString.replace(` ${date.format("LT")}`, "");
			if(timeString.includes(" ")){
				timeString = timeString.substring(0, timeString.lastIndexOf(" "));
			}
	}
	return timeString;
}
