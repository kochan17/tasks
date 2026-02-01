/**
 * GitHub GraphQL API を呼び出す
 */
function callGitHubGraphQL(query, variables) {
  var token = getGitHubToken();
  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + token,
      'User-Agent': 'Google-Apps-Script'
    },
    payload: JSON.stringify({ query: query, variables: variables }),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(GITHUB_GRAPHQL_URL, options);
  var statusCode = response.getResponseCode();

  if (statusCode !== 200) {
    throw new Error('GitHub API エラー: ' + statusCode + ' - ' + response.getContentText());
  }

  var json = JSON.parse(response.getContentText());

  if (json.errors) {
    throw new Error('GitHub GraphQL エラー: ' + JSON.stringify(json.errors));
  }

  return json;
}

/**
 * GitHub Projects V2 からユーザーの全プロジェクトアイテムを取得
 */
function fetchAllProjectItems(owner) {
  var query = ''
    + 'query($owner: String!, $cursor: String) {'
    + '  user(login: $owner) {'
    + '    projectsV2(first: 20, after: $cursor) {'
    + '      nodes {'
    + '        id'
    + '        title'
    + '        items(first: 100) {'
    + '          nodes {'
    + '            content {'
    + '              ... on Issue {'
    + '                title'
    + '                url'
    + '                state'
    + '                repository { name }'
    + '              }'
    + '              ... on DraftIssue {'
    + '                title'
    + '                body'
    + '              }'
    + '            }'
    + '            fieldValues(first: 20) {'
    + '              nodes {'
    + '                ... on ProjectV2ItemFieldDateValue {'
    + '                  date'
    + '                  field { ... on ProjectV2Field { name } }'
    + '                }'
    + '                ... on ProjectV2ItemFieldSingleSelectValue {'
    + '                  name'
    + '                  field { ... on ProjectV2SingleSelectField { name } }'
    + '                }'
    + '              }'
    + '            }'
    + '          }'
    + '        }'
    + '      }'
    + '    }'
    + '  }'
    + '}';

  var response = callGitHubGraphQL(query, { owner: owner });
  return response.data.user.projectsV2.nodes;
}

/**
 * リポジトリの Issue を直接取得（Projects V2 が使えない場合のフォールバック）
 */
function fetchRepoIssues(owner, repo) {
  var query = ''
    + 'query($owner: String!, $repo: String!, $cursor: String) {'
    + '  repository(owner: $owner, name: $repo) {'
    + '    issues(first: 100, states: [OPEN], after: $cursor, orderBy: {field: CREATED_AT, direction: DESC}) {'
    + '      pageInfo { hasNextPage endCursor }'
    + '      nodes {'
    + '        title'
    + '        url'
    + '        state'
    + '        milestone { title dueOn }'
    + '        labels(first: 10) { nodes { name } }'
    + '      }'
    + '    }'
    + '  }'
    + '}';

  var allIssues = [];
  var cursor = null;

  do {
    var response = callGitHubGraphQL(query, { owner: owner, repo: repo, cursor: cursor });
    var data = response.data.repository.issues;

    for (var i = 0; i < data.nodes.length; i++) {
      allIssues.push(data.nodes[i]);
    }

    cursor = data.pageInfo.hasNextPage ? data.pageInfo.endCursor : null;
  } while (cursor);

  return allIssues;
}

/**
 * Projects V2 のアイテムをパースする
 */
function parseProjectItem(item, projectTitle) {
  if (!item.content) return null;

  var content = item.content;
  var fieldValues = item.fieldValues ? item.fieldValues.nodes : [];

  // プロジェクト名（リポジトリ名があればそちらを優先）
  var projectName = projectTitle;
  if (content.repository) {
    projectName = content.repository.name;
  }

  // フィールド値から締切とステータスを取得
  var deadline = '';
  var status = '';

  for (var i = 0; i < fieldValues.length; i++) {
    var field = fieldValues[i];
    if (!field || !field.field) continue;

    var fieldName = field.field.name;

    // 締切フィールド（よくある名前に対応）
    if (fieldName === 'Due date' || fieldName === '締切' || fieldName === 'Deadline' || fieldName === 'Due') {
      deadline = field.date || '';
    }

    // ステータスフィールド
    if (fieldName === 'Status' || fieldName === 'ステータス') {
      status = field.name || '';
    }
  }

  // ステータスのフォールバック
  if (!status && content.state) {
    status = content.state === 'OPEN' ? '未着手' : '完了';
  }

  return {
    project: projectName,
    title: content.title,
    deadline: deadline,
    status: status,
    source: 'GitHub',
    url: content.url || ''
  };
}

/**
 * ラベルからステータスを推定する（Issue フォールバック用）
 */
function getStatusFromLabels(labels) {
  for (var i = 0; i < labels.length; i++) {
    var name = labels[i].name.toLowerCase();
    if (name.indexOf('progress') >= 0 || name.indexOf('進行') >= 0 || name.indexOf('doing') >= 0) {
      return '進行中';
    }
    if (name.indexOf('done') >= 0 || name.indexOf('完了') >= 0) {
      return '完了';
    }
  }
  return '未着手';
}
