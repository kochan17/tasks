/**
 * 案件設定シートを初期設定
 */
function setupProjectSettingsSheet() {
  var sheet = getOrCreateSheet(SHEET_NAMES.PROJECT_SETTINGS);
  var headers = ['プロジェクト名', '報酬額（税抜）', '種別', '備考'];
  setHeaders(sheet, headers);

  // 初期データ
  var projects = [
    ['co-co', '', '受託', '案件ごとに報酬額を入力'],
    ['dating-app-support', '', '自社', ''],
    ['leaning-x', '', '自社', ''],
    ['個人', '', '個人', '']
  ];

  sheet.getRange(2, 1, projects.length, projects[0].length).setValues(projects);

  // 報酬列のフォーマット
  sheet.getRange('B2:B100').setNumberFormat('¥#,##0');

  // 種別ドロップダウン
  var typeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['受託', '自社', '個人'], true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange('C2:C100').setDataValidation(typeRule);

  autoResizeColumns(sheet);
}

/**
 * ダッシュボードシートを初期設定
 */
function setupDashboardSheet() {
  var sheet = getOrCreateSheet(SHEET_NAMES.DASHBOARD);

  // --- セクション1: プロジェクト別サマリー ---
  sheet.getRange('A1').setValue('プロジェクト別サマリー').setFontWeight('bold').setFontSize(14);

  var summaryHeaders = ['プロジェクト', '総作業時間', 'タスク数', '平均タスク時間', '報酬額', '実績時給'];
  var headerRange = sheet.getRange(2, 1, 1, summaryHeaders.length);
  headerRange.setValues([summaryHeaders]);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4285f4');
  headerRange.setFontColor('#ffffff');

  // --- セクション2: 時給分析 ---
  sheet.getRange('A10').setValue('時給分析').setFontWeight('bold').setFontSize(14);

  var hourlyHeaders = ['指標', '値'];
  var hourlyHeaderRange = sheet.getRange(11, 1, 1, hourlyHeaders.length);
  hourlyHeaderRange.setValues([hourlyHeaders]);
  hourlyHeaderRange.setFontWeight('bold');
  hourlyHeaderRange.setBackground('#34a853');
  hourlyHeaderRange.setFontColor('#ffffff');

  var hourlyLabels = [
    ['全プロジェクト合計時間', ''],
    ['受託案件の合計報酬', ''],
    ['受託案件の実績時給', ''],
    ['目標時給（手動入力）', ''],
    ['ギャップ', '']
  ];
  sheet.getRange(12, 1, hourlyLabels.length, 2).setValues(hourlyLabels);

  // 報酬・時給列のフォーマット
  sheet.getRange('E3:F8').setNumberFormat('¥#,##0');

  autoResizeColumns(sheet);
}

/**
 * ダッシュボードを作業ログから自動更新
 */
function updateDashboard() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName(SHEET_NAMES.WORK_LOG);
  var settingsSheet = ss.getSheetByName(SHEET_NAMES.PROJECT_SETTINGS);
  var dashSheet = ss.getSheetByName(SHEET_NAMES.DASHBOARD);

  if (!logSheet || !settingsSheet || !dashSheet) {
    SpreadsheetApp.getUi().alert('先に「初期設定」を実行してください。');
    return;
  }

  // 作業ログデータを取得
  var logLastRow = logSheet.getLastRow();
  if (logLastRow <= 1) {
    SpreadsheetApp.getUi().alert('作業ログにデータがありません。\nまず作業を記録してください。');
    return;
  }

  var logData = logSheet.getRange(2, 1, logLastRow - 1, 8).getValues();

  // 案件設定データを取得
  var settingsLastRow = settingsSheet.getLastRow();
  var settingsData = settingsLastRow > 1
    ? settingsSheet.getRange(2, 1, settingsLastRow - 1, 4).getValues()
    : [];

  // プロジェクトごとに集計
  var projectStats = {};

  for (var i = 0; i < logData.length; i++) {
    var project = logData[i][2]; // プロジェクト名
    var duration = logData[i][6]; // 作業時間

    if (!project || project === '') continue;

    if (!projectStats[project]) {
      projectStats[project] = { totalHours: 0, taskCount: 0 };
    }

    // 時間を hours に変換（Sheets は時間を日の分数として保持）
    var hours = 0;
    if (duration instanceof Date) {
      hours = duration.getHours() + duration.getMinutes() / 60;
    } else if (typeof duration === 'number' && duration > 0) {
      hours = duration * 24;
    }

    projectStats[project].totalHours += hours;
    projectStats[project].taskCount++;
  }

  // 報酬マップ作成
  var revenueMap = {};
  var typeMap = {};
  for (var s = 0; s < settingsData.length; s++) {
    if (settingsData[s][0]) {
      revenueMap[settingsData[s][0]] = settingsData[s][1] || 0;
      typeMap[settingsData[s][0]] = settingsData[s][2] || '';
    }
  }

  // プロジェクト別サマリーをクリア（3行目〜8行目）
  dashSheet.getRange(3, 1, 6, 6).clearContent();

  // 書き込み
  var projects = Object.keys(projectStats);
  var totalAllHours = 0;
  var totalRevenue = 0;
  var totalRevenueHours = 0;

  for (var p = 0; p < projects.length; p++) {
    var proj = projects[p];
    var stats = projectStats[proj];
    var revenue = revenueMap[proj] || 0;
    var avgTime = stats.taskCount > 0 ? stats.totalHours / stats.taskCount : 0;
    var hourlyRate = (stats.totalHours > 0 && revenue > 0) ? Math.round(revenue / stats.totalHours) : 0;

    var row = p + 3;
    dashSheet.getRange(row, 1).setValue(proj);
    dashSheet.getRange(row, 2).setValue(formatHoursMinutes(stats.totalHours));
    dashSheet.getRange(row, 3).setValue(stats.taskCount + '件');
    dashSheet.getRange(row, 4).setValue(formatHoursMinutes(avgTime));
    dashSheet.getRange(row, 5).setValue(revenue > 0 ? revenue : '—');
    dashSheet.getRange(row, 6).setValue(hourlyRate > 0 ? hourlyRate : '—');

    if (revenue > 0) {
      dashSheet.getRange(row, 5).setNumberFormat('¥#,##0');
      dashSheet.getRange(row, 6).setNumberFormat('¥#,##0');
    }

    totalAllHours += stats.totalHours;
    if (typeMap[proj] === '受託' && revenue > 0) {
      totalRevenue += revenue;
      totalRevenueHours += stats.totalHours;
    }
  }

  // 時給分析を更新
  var actualHourlyRate = (totalRevenueHours > 0 && totalRevenue > 0)
    ? Math.round(totalRevenue / totalRevenueHours)
    : 0;

  dashSheet.getRange(12, 2).setValue(formatHoursMinutes(totalAllHours));
  dashSheet.getRange(13, 2).setValue(totalRevenue > 0 ? totalRevenue : '—');
  if (totalRevenue > 0) {
    dashSheet.getRange(13, 2).setNumberFormat('¥#,##0');
  }
  dashSheet.getRange(14, 2).setValue(actualHourlyRate > 0 ? actualHourlyRate : '—');
  if (actualHourlyRate > 0) {
    dashSheet.getRange(14, 2).setNumberFormat('¥#,##0');
  }

  // 目標時給は手動入力を保持（上書きしない）
  var targetRate = dashSheet.getRange(15, 2).getValue();

  // ギャップ計算
  if (targetRate && actualHourlyRate > 0) {
    var gap = targetRate - actualHourlyRate;
    if (gap > 0) {
      var gapPercent = Math.round((gap / actualHourlyRate) * 100);
      dashSheet.getRange(16, 2).setValue('¥' + gap.toLocaleString() + '（' + gapPercent + '%アップ必要）');
    } else {
      dashSheet.getRange(16, 2).setValue('目標達成済み');
    }
  }

  SpreadsheetApp.getActiveSpreadsheet().toast('ダッシュボードを更新しました', '完了');
}
