export function versionGreaterOrEqual(version1, version2){
	var version1Cleaned = version1.split('.').map(d => String(parseInt(d)).padStart(3,'0')).join('.');
  var version2Cleaned = version2.split('.').map(d => String(parseInt(d)).padStart(3,'0')).join('.');
  return version1Cleaned >= version2Cleaned;
}