const axios = require('axios');
require('dotenv').config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = process.env.REPO_OWNER || 'GAKU27';
const REPO_NAME = process.env.REPO_NAME || 'Mercari-Search';

if (!GITHUB_TOKEN) {
  console.warn('WARN: GITHUB_TOKEN environment variable is missing.');
}

const toBase64 = str => Buffer.from(str).toString('base64');
const fromBase64 = base64 => Buffer.from(base64.replace(/[\n\r\s]/g, ''), 'base64').toString('utf8');

const getAuthHeaders = () => ({
  'Authorization': `token ${GITHUB_TOKEN}`,
  'Accept': 'application/vnd.github.v3+json'
});

// 直列化してGitHub上でコンフリクト（409 Error）が起きるのを防ぐためのキュー
let writeMutex = Promise.resolve();
function enqueueWrite(operation) {
  writeMutex = writeMutex.then(() => operation()).catch(err => {
    console.error('Write operation failed:', err);
    throw err;
  });
  return writeMutex;
}

async function getFileContent(filePath) {
  try {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`;
    const res = await axios.get(url, { headers: getAuthHeaders() });
    return {
      content: JSON.parse(fromBase64(res.data.content)),
      sha: res.data.sha
    };
  } catch (e) {
    if (e.response && e.response.status === 404) {
      return { content: [], sha: null };
    }
    throw e;
  }
}

async function updateFileContent(filePath, contentObj, sha, message) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`;
  await axios.put(url, {
    message,
    content: toBase64(JSON.stringify(contentObj, null, 2)),
    sha
  }, { headers: getAuthHeaders() });
}

// --- 公開API ---

async function getTrackedItems() {
  const result = await getFileContent('client/public/tracked_items.json');
  return result.content || [];
}

async function getPriceHistory() {
  const result = await getFileContent('client/public/price_history.json');
  return result.content || {};
}

async function addTrackedItem(url) {
  return enqueueWrite(async () => {
    const { content: items, sha } = await getFileContent('client/public/tracked_items.json');
    if (items.some(item => item.url === url)) {
      return { success: true, message: '既に追跡中です' };
    }
    items.push({ url, name: '' });
    await updateFileContent('client/public/tracked_items.json', items, sha, 'feat: add tracked item via API proxy');
    return { success: true };
  });
}

async function deleteTrackedItem(url) {
  return enqueueWrite(async () => {
    const { content: items, sha } = await getFileContent('client/public/tracked_items.json');
    const newItems = items.filter(item => item.url !== url);
    if (newItems.length !== items.length) {
      await updateFileContent('client/public/tracked_items.json', newItems, sha, 'feat: remove tracked item via API proxy');
    }
    return { success: true };
  });
}

async function addPushSubscription(subscription) {
  return enqueueWrite(async () => {
    const { content: subs, sha } = await getFileContent('client/public/push_subscriptions.json');
    const exists = subs.some(sub => sub.endpoint === subscription.endpoint);
    if (!exists) {
      subs.push(subscription);
      await updateFileContent('client/public/push_subscriptions.json', subs, sha, 'feat: add push subscription via API proxy');
    }
    return { success: true };
  });
}

async function removePushSubscription(endpoint) {
  return enqueueWrite(async () => {
    const { content: subs, sha } = await getFileContent('client/public/push_subscriptions.json');
    const newSubs = subs.filter(sub => sub.endpoint !== endpoint);
    if (newSubs.length !== subs.length) {
      await updateFileContent('client/public/push_subscriptions.json', newSubs, sha, 'feat: remove push subscription via API proxy');
    }
    return { success: true };
  });
}

async function triggerWorkflow() {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/update-prices.yml/dispatches`;
  await axios.post(url, { ref: 'main' }, { headers: getAuthHeaders() });
}

module.exports = {
  getTrackedItems,
  getPriceHistory,
  addTrackedItem,
  deleteTrackedItem,
  addPushSubscription,
  removePushSubscription,
  triggerWorkflow
};
