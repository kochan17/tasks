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

var REPOS = [
  { owner: 'kochan17', repo: 'dating-app-support' },
  { owner: 'kochan17', repo: 'leaning-x' },
  { owner: 'kochan17', repo: 'co-co' }
];

var PROJECT_NAMES = ['co-co', 'dating-app-support', 'leaning-x', '個人'];

var GITHUB_OWNER = 'kochan17';

var GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';

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
