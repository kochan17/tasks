/**
 * タスク一覧シートを初期設定
 */
function setupTaskListSheet() {
  var sheet = getOrCreateSheet(SHEET_NAMES.TASK_LIST);
  var headers = ['プロジェクト', 'タスク名', '締切', 'ステータス', 'ソース', 'URL'];
  setHeaders(sheet, headers);

  // 列幅
  sheet.setColumnWidth(1, 160);
  sheet.setColumnWidth(2, 350);
  sheet.setColumnWidth(3, 100);
  sheet.setColumnWidth(4, 100);
  sheet.setColumnWidth(5, 80);
  sheet.setColumnWidth(6, 250);

  // プロジェクト名のドロップダウン（案件設定シートから動的に取得）
  var projectNames = getProjectNamesFromSheet();
  if (projectNames.length === 0) {
    projectNames = ['co-co', 'dating-app-support', 'leaning-x', '個人'];
  }
  var projectRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(projectNames, true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange('A2:A500').setDataValidation(projectRule);

  // ステータスのドロップダウン
  var statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['未着手', '進行中', '完了', 'Todo', 'In Progress', 'Done'], true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange('D2:D500').setDataValidation(statusRule);

  // ソースのドロップダウン
  var sourceRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['GitHub', '手動'], true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange('E2:E500').setDataValidation(sourceRule);

  // 締切列の日付フォーマット
  sheet.getRange('C2:C500').setNumberFormat('yyyy/mm/dd');
}

/**
 * GitHubからタスクを同期してタスク一覧を更新
 */
function syncGitHubTasks() {
  var sheet = getOrCreateSheet(SHEET_NAMES.TASK_LIST);

  // 手動タスクを退避
  var manualTasks = getManualTasks(sheet);

  // GitHubからタスク取得
  var githubTasks = [];

  // 案件設定シートに登録されたリポジトリから Issue を取得
  var repos = getReposFromSheet();
  for (var r = 0; r < repos.length; r++) {
    try {
      var issues = fetchRepoIssues(repos[r].owner, repos[r].repo);
      for (var j = 0; j < issues.length; j++) {
        var issue = issues[j];
        githubTasks.push({
          project: repos[r].repo,
          title: issue.title,
          deadline: issue.milestone ? issue.milestone.dueOn : '',
          status: getStatusFromLabels(issue.labels.nodes),
          source: 'GitHub',
          url: issue.url
        });
      }
    } catch (repoErr) {
      Logger.log(repos[r].repo + ' の取得に失敗: ' + repoErr.message);
    }
  }

  // 重複排除（URL ベース）
  var seen = {};
  var uniqueGithubTasks = [];
  for (var k = 0; k < githubTasks.length; k++) {
    var key = githubTasks[k].url || githubTasks[k].title;
    if (!seen[key]) {
      seen[key] = true;
      uniqueGithubTasks.push(githubTasks[k]);
    }
  }

  // シートをクリアして再書き込み
  clearDataRows(sheet);

  var allTasks = uniqueGithubTasks.concat(manualTasks);

  if (allTasks.length > 0) {
    var data = [];
    for (var t = 0; t < allTasks.length; t++) {
      data.push([
        allTasks[t].project,
        allTasks[t].title,
        allTasks[t].deadline ? formatDate(allTasks[t].deadline) : '',
        allTasks[t].status,
        allTasks[t].source,
        allTasks[t].url || ''
      ]);
    }
    sheet.getRange(2, 1, data.length, data[0].length).setValues(data);
  }

  SpreadsheetApp.getActiveSpreadsheet().toast(
    'GitHub: ' + uniqueGithubTasks.length + '件、手動: ' + manualTasks.length + '件',
    '同期完了'
  );
}

/**
 * 手動タスク（ソースが「手動」の行）を退避用に取得
 */
function getManualTasks(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  var data = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
  var manual = [];

  for (var i = 0; i < data.length; i++) {
    if (data[i][4] === '手動') {
      manual.push({
        project: data[i][0],
        title: data[i][1],
        deadline: data[i][2],
        status: data[i][3],
        source: '手動',
        url: data[i][5]
      });
    }
  }

  return manual;
}
