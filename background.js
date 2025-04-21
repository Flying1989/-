// 存储每个标签页的计时数据
let tabTimers = {};
let defaultSettings = {
  timePoints: [
    { time: 300, color: "#4CAF50", size: 1.0, widthPercent: 5 },    // 5分钟 - 绿色
    { time: 600, color: "#2196F3", size: 1.2, widthPercent: 7 },    // 10分钟 - 蓝色
    { time: 1200, color: "#9C27B0", size: 1.5, widthPercent: 10 },  // 20分钟 - 紫色
    { time: 1800, color: "#F44336", size: 2.0, widthPercent: 15 }   // 30分钟 - 红色
  ],
  soundAlerts: [
    { time: 300, sound: "default.mp3" },  // 5分钟提醒
    { time: 1800, sound: "default.mp3" }  // 30分钟提醒
  ],
  pauseOnTabSwitch: true,
  continueTimingWhenHidden: true
};

// 初始化设置
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get('settings', (data) => {
    if (!data.settings) {
      chrome.storage.local.set({ settings: defaultSettings });
    }
  });
});

// 监听标签页切换
chrome.tabs.onActivated.addListener((activeInfo) => {
  const tabId = activeInfo.tabId;
  
  console.log("标签页切换到:", tabId);
  
  // 获取设置
  chrome.storage.local.get('settings', (data) => {
    const settings = data.settings || defaultSettings;
    
    if (settings.pauseOnTabSwitch) {
      // 暂停所有其他标签页的计时器
      Object.keys(tabTimers).forEach((id) => {
        const numId = parseInt(id);
        if (numId !== tabId && tabTimers[numId]) {
          console.log("暂停标签页:", numId);
          chrome.tabs.sendMessage(numId, { action: "forcePause" }, (response) => {
            // 处理可能的错误
            if (chrome.runtime.lastError) {
              console.log("发送暂停消息时出错:", chrome.runtime.lastError.message);
            }
          });
        }
      });
      
      // 如果当前标签页有计时器，则恢复
      if (tabTimers[tabId]) {
        console.log("恢复标签页:", tabId, "状态:", tabTimers[tabId]);
        
        // 延迟一点时间再恢复，确保暂停操作已完成
        setTimeout(() => {
          chrome.tabs.sendMessage(tabId, { 
            action: "forceResume",
            timerData: tabTimers[tabId]
          }, (response) => {
            // 处理可能的错误
            if (chrome.runtime.lastError) {
              console.log("发送恢复消息时出错:", chrome.runtime.lastError.message);
              
              // 如果发送消息失败，可能是因为内容脚本尚未加载
              // 添加一个监听器，等待标签页完成加载
              const listener = (changedTabId, changeInfo) => {
                if (changedTabId === tabId && changeInfo.status === 'complete') {
                  chrome.tabs.sendMessage(tabId, { 
                    action: "forceResume",
                    timerData: tabTimers[tabId]
                  });
                  chrome.tabs.onUpdated.removeListener(listener);
                }
              };
              chrome.tabs.onUpdated.addListener(listener);
            }
          });
        }, 100);
      }
    }
  });
});

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // 只处理完成加载的标签页
  if (changeInfo.status === 'complete') {
    // 检查这个标签页是否是当前活动的标签页
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs.length > 0 && tabs[0].id === tabId && tabTimers[tabId]) {
        // 这是当前活动的标签页，恢复计时器
        console.log("标签页加载完成，恢复计时器:", tabId);
        chrome.tabs.sendMessage(tabId, { 
          action: "forceResume",
          timerData: tabTimers[tabId]
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.log("发送恢复消息时出错:", chrome.runtime.lastError.message);
          }
        });
      }
    });
  }
});

// 监听标签页关闭
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabTimers[tabId]) {
    // 保存历史记录
    saveTimerHistory(tabId);
    delete tabTimers[tabId];
  }
});

// 监听来自内容脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 检查 sender.tab 是否存在，如果不存在则提前返回
  if (!sender.tab && message.action !== "getSettings") {
    console.warn("消息发送者没有关联的标签页:", message);
    sendResponse({ error: "No associated tab" });
    return;
  }
  
  const tabId = sender.tab ? sender.tab.id : null;
  
  switch (message.action) {
    case "initTimer":
      // 初始化标签页计时器
      if (tabId) {
        if (!tabTimers[tabId]) {
          tabTimers[tabId] = {
            url: sender.tab.url,
            title: sender.tab.title,
            startTime: Date.now(),
            elapsedTime: 0,
            isRunning: true,
            isPaused: false,
            isHidden: false
          };
        }
        sendResponse({ timerData: tabTimers[tabId] });
      }
      break;
      
    case "updateTimer":
      // 更新计时器状态
      if (tabId && tabTimers[tabId]) {
        tabTimers[tabId].elapsedTime = message.elapsedTime;
        tabTimers[tabId].isRunning = message.isRunning;
        tabTimers[tabId].isPaused = message.isPaused;
        tabTimers[tabId].isHidden = message.isHidden;
      }
      break;
      
    case "getSettings":
      // 获取设置
      chrome.storage.local.get('settings', (data) => {
        sendResponse({ settings: data.settings || defaultSettings });
      });
      return true; // 保持消息通道开放以进行异步响应
      
    case "saveHistory":
      if (sender.tab) {
        const tabId = sender.tab.id;
        saveTimerHistory(tabId);
        
        // 如果是同步请求，立即响应
        if (message.sync) {
          sendResponse({ success: true });
        }
      }
      break;
  }
  
  // 对于同步请求，返回 true 以保持消息通道开放
  if (message.sync) {
    return true;
  }
});

// 保存历史记录
function saveTimerHistory(tabId) {
  if (!tabTimers[tabId]) return;
  
  const timer = tabTimers[tabId];
  const historyEntry = {
    url: timer.url,
    title: timer.title,
    date: new Date().toISOString(),
    duration: timer.elapsedTime
  };
  
  chrome.storage.local.get('history', (data) => {
    const history = data.history || [];
    history.push(historyEntry);
    chrome.storage.local.set({ history: history });
  });
}