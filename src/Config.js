/**
 * 設定値
 * GitHub Token は Script Properties に保存する（セキュリティのため）
 */

var SHEET_NAMES = {
  TASK_LIST: 'タスク一覧',
  WORK_LOG: '作業ログ',
  PROJECT_SETTINGS: '案件設定',
  DASHBOARD: 'ダッシュボード'
};

var GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';

/**
 * 案件設定シートから GitHub リポジトリ一覧を取得
 * URL が空の行はスキップ（「個人」など）
 * 返り値: [{ owner: 'kochan17', repo: 'co-co' }, ...]
 */
function getReposFromSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.PROJECT_SETTINGS);
  if (!sheet) return [];

  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  // 列: [0]プロジェクト名, [1]GitHub URL
  var data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  var repos = [];

  for (var i = 0; i < data.length; i++) {
    var url = data[i][1];
    if (!url || url === '') continue;

    var parsed = parseGitHubUrl(url);
    if (parsed) {
      repos.push(parsed);
    }
  }

  return repos;
}

/**
 * 案件設定シートからプロジェクト名一覧を取得
 * 返り値: ['co-co', 'dating-app-support', ...]
 */
function getProjectNamesFromSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.PROJECT_SETTINGS);
  if (!sheet) return [];

  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  var data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  var names = [];

  for (var i = 0; i < data.length; i++) {
    if (data[i][0] && data[i][0] !== '') {
      names.push(data[i][0]);
    }
  }

  return names;
}

/**
 * GitHub URL から owner と repo を抽出する
 * 例: 'https://github.com/kochan17/co-co' -> { owner: 'kochan17', repo: 'co-co' }
 */
function parseGitHubUrl(url) {
  var str = String(url).trim();
  // 末尾のスラッシュや .git を除去
  str = str.replace(/\/+$/, '').replace(/\.git$/, '');

  var match = str.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (match) {
    return { owner: match[1], repo: match[2] };
  }
  return null;
}

/**
 * GitHub Token を取得（Script Properties から）
 */
function getGitHubToken() {
  var token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) {
    throw new Error(
      'GitHub Token が設定されていません。\n' +
      'スクリプトプロパティに GITHUB_TOKEN を設定してください。\n' +
      '（スクリプトエディタ → プロジェクトの設定 → スクリプトプロパティ）'
    );
  }
  return token;
}
