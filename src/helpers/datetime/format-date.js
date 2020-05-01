import fecha from "fecha";

// Check for support of native locale string options
function toLocaleDateStringSupportsOptions() {
  try {
    new Date().toLocaleDateString("i");
  } catch (e) {
    return e.name === "RangeError";
  }
  return false;
}

export const formatDate = (toLocaleDateStringSupportsOptions()
  ? (dateObj, locale) =>
      dateObj.toLocaleDateString(locales, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
  : (dateObj) => fecha.format(dateObj, "mediumDate"));