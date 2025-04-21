document.addEventListener('DOMContentLoaded', function() {
    const timerDisplay = document.getElementById('timer');
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');
    const hideBtn = document.getElementById('hideBtn');
    const settingsLink = document.getElementById('settingsLink');
    const historyLink = document.getElementById('historyLink');
    
    let activeTabId;
    let timerState = {
      elapsedTime: 0,
      isPaused: false,
      isHidden: false
    };
    
    // 获取当前活动标签页
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs.length > 0) {
        activeTabId = tabs[0].id;
        
        // 获取计时器状态
        chrome.runtime.sendMessage({ action: "getTabTimer", tabId: activeTabId }, function(response) {
          if (response && response.timerData) {
            timerState = response.timerData;
            updateDisplay();
            updateButtons();
          }
        });
      }
    });
    
    // 更新显示
    function updateDisplay() {
      const hours = Math.floor(timerState.elapsedTime / 3600);
      const minutes = Math.floor((timerState.elapsedTime % 3600) / 60);
      const seconds = timerState.elapsedTime % 60;
      
      timerDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // 更新按钮状态
    function updateButtons() {
      pauseBtn.textContent = timerState.isPaused ? "继续" : "暂停";
      hideBtn.textContent = timerState.isHidden ? "显示" : "隐藏";
    }
    
    // 暂停/继续按钮
    pauseBtn.addEventListener('click', function() {
      chrome.tabs.sendMessage(activeTabId, { 
        action: timerState.isPaused ? "resume" : "pause" 
      });
      
      timerState.isPaused = !timerState.isPaused;
      updateButtons();
    });
    
    // 重置按钮
    resetBtn.addEventListener('click', function() {
      chrome.tabs.sendMessage(activeTabId, { action: "reset" });
      timerState.elapsedTime = 0;
      timerState.isPaused = false;
      updateDisplay();
      updateButtons();
    });
    
    // 隐藏/显示按钮
    hideBtn.addEventListener('click', function() {
      chrome.tabs.sendMessage(activeTabId, { 
        action: timerState.isHidden ? "show" : "hide" 
      });
      
      timerState.isHidden = !timerState.isHidden;
      updateButtons();
    });
    
    // 设置链接
    settingsLink.addEventListener('click', function() {
      chrome.runtime.openOptionsPage();
    });
    
    // 历史记录链接
    historyLink.addEventListener('click', function() {
      chrome.tabs.create({ url: chrome.runtime.getURL('history.html') });
    });
  });