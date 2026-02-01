/**
 * 作業ログシートを初期設定
 */
function setupWorkLogSheet() {
  var sheet = getOrCreateSheet(SHEET_NAMES.WORK_LOG);
  var headers = ['No.', '日付', 'プロジェクト', 'タスク名', '開始時刻', '終了時刻', '作業時間', 'メモ'];
  setHeaders(sheet, headers);

  // 列幅
  sheet.setColumnWidth(1, 50);
  sheet.setColumnWidth(2, 100);
  sheet.setColumnWidth(3, 160);
  sheet.setColumnWidth(4, 350);
  sheet.setColumnWidth(5, 80);
  sheet.setColumnWidth(6, 80);
  sheet.setColumnWidth(7, 80);
  sheet.setColumnWidth(8, 300);

  var maxRow = 201;

  // No. の自動採番と作業時間の自動計算（200行分）
  for (var row = 2; row <= maxRow; row++) {
    // No.: タスク名が入力されていたら行番号-1を表示
    sheet.getRange(row, 1).setFormula('=IF(D' + row + '<>"",ROW()-1,"")');
    // 作業時間: 開始・終了が両方入っていたら差分を計算
    sheet.getRange(row, 7).setFormula('=IF(AND(E' + row + '<>"",F' + row + '<>""),F' + row + '-E' + row + ',"")');
  }

  // フォーマット設定
  sheet.getRange('B2:B' + maxRow).setNumberFormat('yyyy/mm/dd');
  sheet.getRange('E2:F' + maxRow).setNumberFormat('HH:mm');
  sheet.getRange('G2:G' + maxRow).setNumberFormat('[h]:mm');

  // プロジェクト名のドロップダウン
  var projectRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(PROJECT_NAMES, true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange('C2:C' + maxRow).setDataValidation(projectRule);
}
