/**
 * スプレッドシートを開いたときにカスタムメニューを追加
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('プロジェクト管理')
    .addItem('GitHub からタスクを同期', 'syncGitHubTasks')
    .addItem('ダッシュボードを更新', 'updateDashboard')
    .addSeparator()
    .addItem('初期設定', 'initializeSheets')
    .addItem('自動同期を設定（1時間ごと）', 'setupAutoSync')
    .addToUi();
}

/**
 * 初期設定：全シートを作成
 */
function initializeSheets() {
  setupTaskListSheet();
  setupWorkLogSheet();
  setupProjectSettingsSheet();
  setupDashboardSheet();

  SpreadsheetApp.getUi().alert(
    '初期設定が完了しました。\n\n' +
    '次のステップ:\n' +
    '1. スクリプトプロパティに GITHUB_TOKEN を設定\n' +
    '   （プロジェクトの設定 → スクリプトプロパティ）\n' +
    '2.「プロジェクト管理」メニューから GitHub 同期を実行\n' +
    '3. 案件設定シートに報酬額を入力'
  );
}

/**
 * 定期実行用（トリガーで自動実行される）
 */
function scheduledSync() {
  syncGitHubTasks();
  updateDashboard();
}

/**
 * 自動同期トリガーを設定（1時間ごと）
 */
function setupAutoSync() {
  // 既存の scheduledSync トリガーを削除
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'scheduledSync') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // 新しいトリガーを作成（1時間ごと）
  ScriptApp.newTrigger('scheduledSync')
    .timeBased()
    .everyHours(1)
    .create();

  SpreadsheetApp.getUi().alert(
    '自動同期を設定しました。\n1時間ごとに GitHub のタスクが自動同期されます。'
  );
}
