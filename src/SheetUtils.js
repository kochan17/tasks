/**
 * シートを取得（なければ作成）
 */
function getOrCreateSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

/**
 * ヘッダー行を設定
 */
function setHeaders(sheet, headers) {
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4285f4');
  headerRange.setFontColor('#ffffff');
  sheet.setFrozenRows(1);
}

/**
 * シートのデータ部分をクリア（ヘッダーは残す）
 */
function clearDataRows(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  }
}

/**
 * 列幅を自動調整
 */
function autoResizeColumns(sheet) {
  var lastCol = sheet.getLastColumn();
  for (var i = 1; i <= lastCol; i++) {
    sheet.autoResizeColumn(i);
  }
}

/**
 * 日付をフォーマット
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    var date = new Date(dateStr);
    return Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy/MM/dd');
  } catch (e) {
    return dateStr;
  }
}

/**
 * 時間（小数）を「○時間○分」形式にフォーマット
 */
function formatHoursMinutes(hours) {
  var h = Math.floor(hours);
  var m = Math.round((hours - h) * 60);
  if (h === 0 && m === 0) return '0分';
  if (h === 0) return m + '分';
  if (m === 0) return h + '時間';
  return h + '時間' + m + '分';
}
