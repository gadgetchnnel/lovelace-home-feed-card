import { formatDateTime } from "./datetime/format-date-time.js";
import { formatDate } from "./datetime/format-date.js";
import { formatTime } from "./datetime/format-time.js";
import { computeStateDomain } from "./compute-state-domain.js";

export function computeStateDisplay(localize, stateObj, language) {
  let display;
  
  if (stateObj.state === "unknown" || stateObj.state === "unavailable") {
    return localize(`state.default.${stateObj.state}`);
  }
  
  if (stateObj.attributes.device_class == "timestamp") {
    return `${stateObj.state}`;
  }
  
  if (stateObj.attributes.unit_of_measurement) {
    return `${stateObj.state} ${stateObj.attributes.unit_of_measurement}`;
  }
  
  const domain = computeStateDomain(stateObj);
  
  if (domain === "input_datetime") {
    let date;
    if (!stateObj.attributes.has_time) {
      date = new Date(
        stateObj.attributes.year,
        stateObj.attributes.month - 1,
        stateObj.attributes.day
      );
      return formatDate(date, language);
    }
    
    if (!stateObj.attributes.has_date) {
      const now = new Date();
      date = new Date(
        // Due to bugs.chromium.org/p/chromium/issues/detail?id=797548
        // don't use artificial 1970 year.
        now.getFullYear(),
        now.getMonth(),
        now.getDay(),
        stateObj.attributes.hour,
        stateObj.attributes.minute
      );
      return formatTime(date, language);
    }

    date = new Date(
      stateObj.attributes.year,
      stateObj.attributes.month - 1,
      stateObj.attributes.day,
      stateObj.attributes.hour,
      stateObj.attributes.minute
    );
    return formatDateTime(date, language);
  }
  
  return (
    // Return device class translation
    (stateObj.attributes.device_class &&
      localize(
        `component.${domain}.state.${stateObj.attributes.device_class}.${stateObj.state}`
      )) ||
    // Return default translation
    localize(`component.${domain}.state._.${stateObj.state}`) ||
    // We don't know! Return the raw state.
    stateObj.state
  );
}