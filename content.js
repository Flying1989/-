// 计时器状态
let timerState = {
    startTime: Date.now(),
    elapsedTime: 0,
    elapsedMilliseconds: 0, // 添加毫秒记录
    isRunning: true,
    isPaused: false,
    isHidden: false
  };
  
  // 设置
  let settings = {};
  
  // 计时器DOM元素
  let timerElement;
  let timerContainer;
  let timerControls;
  
  // 初始化
  // 在初始化计时器函数中添加拖动功能
  function initializeTimer() {
    // 创建计时器容器
    timerContainer = document.createElement('div');
    timerContainer.className = 'jishichajian-container';
    
    // 添加拖动功能
    let isDragging = false;
    let offsetX, offsetY;
    
    timerContainer.addEventListener('mousedown', function(e) {
      // 只有当点击的是容器本身而不是按钮时才启用拖动
      if (e.target === timerContainer || e.target === timerElement) {
        isDragging = true;
        offsetX = e.clientX - timerContainer.getBoundingClientRect().left;
        offsetY = e.clientY - timerContainer.getBoundingClientRect().top;
      }
    });
    
    document.addEventListener('mousemove', function(e) {
      if (isDragging) {
        const x = e.clientX - offsetX;
        const y = e.clientY - offsetY;
        
        // 确保计时器不会被拖出视口
        const maxX = window.innerWidth - timerContainer.offsetWidth;
        const maxY = window.innerHeight - timerContainer.offsetHeight;
        
        timerContainer.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
        timerContainer.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
        timerContainer.style.right = 'auto'; // 取消右侧定位
      }
    });
    
    document.addEventListener('mouseup', function() {
      isDragging = false;
    });
    
    // 创建计时器显示
    timerElement = document.createElement('div');
    timerElement.className = 'jishichajian-timer';
    timerContainer.appendChild(timerElement);
    
    // 创建控制按钮
    timerControls = document.createElement('div');
    timerControls.className = 'jishichajian-controls';
    
    // 暂停/继续按钮
    const pauseButton = document.createElement('button');
    pauseButton.className = 'jishichajian-button jishichajian-pause';
    pauseButton.innerHTML = '⏸️';
    pauseButton.title = '暂停/继续';
    pauseButton.addEventListener('click', togglePause);
    
    // 重置按钮
    const resetButton = document.createElement('button');
    resetButton.className = 'jishichajian-button jishichajian-reset';
    resetButton.innerHTML = '🔄';
    resetButton.title = '重置';
    resetButton.addEventListener('click', resetTimer);
    
    // 隐藏/显示按钮
    const hideButton = document.createElement('button');
    hideButton.className = 'jishichajian-button jishichajian-hide';
    hideButton.innerHTML = '👁️';
    hideButton.title = '隐藏/显示';
    hideButton.addEventListener('click', toggleVisibility);
    
    timerControls.appendChild(pauseButton);
    timerControls.appendChild(resetButton);
    timerControls.appendChild(hideButton);
    
    timerContainer.appendChild(timerControls);
    
    // 添加到页面
    document.body.appendChild(timerContainer);
    
    // 从后台获取设置
    chrome.runtime.sendMessage({ action: "getSettings" }, (response) => {
      settings = response.settings;
      updateTimerStyle(0); // 初始化样式
    });
    
    // 初始化计时器状态
    chrome.runtime.sendMessage({ action: "initTimer" }, (response) => {
      if (response && response.timerData) {
        timerState = response.timerData;
        updateTimerDisplay();
      }
    });
    
    // 开始计时
    startTimer();
  }
  
  // 开始计时
  function startTimer() {
    if (!timerState.isRunning) {
      timerState.isRunning = true;
      timerState.startTime = Date.now() - timerState.elapsedTime;
      updateBackgroundState();
    }
    
    updateTimerDisplay();
    
    // 每秒更新一次
    setTimeout(updateTimer, 1000);
  }
  
  // 更新计时器
  function updateTimer() {
    if (timerState.isRunning && !timerState.isPaused) {
      const now = Date.now();
      timerState.elapsedTime = Math.floor((now - timerState.startTime) / 1000);
      timerState.elapsedMilliseconds = now - timerState.startTime;
      updateTimerDisplay();
      checkTimePoints();
    }
    
    // 更新后台状态
    updateBackgroundState();
    
    // 继续更新，改为每10毫秒更新一次
    setTimeout(updateTimer, 10);
  }
  
  // 更新计时器显示
  function updateTimerDisplay() {
    if (!timerElement) return;
    
    const totalMilliseconds = timerState.elapsedMilliseconds;
    const hours = Math.floor(totalMilliseconds / 3600000);
    const minutes = Math.floor((totalMilliseconds % 3600000) / 60000);
    const seconds = Math.floor((totalMilliseconds % 60000) / 1000);
    const milliseconds = Math.floor((totalMilliseconds % 1000) / 10); // 只显示百分之一秒
    
    timerElement.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
    
    // 根据时间更新样式
    updateTimerStyle(timerState.elapsedTime);
  }
  
  // 更新计时器样式
  function updateTimerStyle(seconds) {
    if (!settings.timePoints || !timerElement) return;
    
    // 默认样式（最小时间点之前）
    let style = settings.timePoints[0];
    
    // 查找当前时间对应的样式
    for (let i = settings.timePoints.length - 1; i >= 0; i--) {
      if (seconds >= settings.timePoints[i].time) {
        style = settings.timePoints[i];
        break;
      }
    }
    
    // 应用样式
    timerElement.style.color = style.color;
    timerElement.style.fontSize = `${style.size}rem`;
    timerContainer.style.width = `${style.widthPercent}%`;
  }
  
  // 检查时间点并播放声音
  function checkTimePoints() {
    if (!settings.soundAlerts) return;
    
    settings.soundAlerts.forEach(alert => {
      if (timerState.elapsedTime === alert.time) {
        playSound(alert.sound);
      }
    });
  }
  
  // 播放声音
  function playSound(soundFile) {
    console.log("尝试播放声音:", soundFile);
    
    // 检查是否是自定义声音
    if (soundFile.startsWith('custom_')) {
      chrome.storage.local.get('customSounds', function(data) {
        if (data.customSounds && data.customSounds[soundFile]) {
          // 创建一次性的音频上下文来播放声音，避免电流声
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          
          // 将base64数据转换为ArrayBuffer
          const base64 = data.customSounds[soundFile].split(',')[1];
          const binaryString = window.atob(base64);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          // 解码音频数据
          audioContext.decodeAudioData(bytes.buffer, function(buffer) {
            // 创建音源并播放
            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContext.destination);
            source.start(0);
          }, function(error) {
            console.error("解码音频数据时出错:", error);
            playDefaultSound();
          });
        } else {
          console.error("找不到自定义声音:", soundFile);
          playDefaultSound();
        }
      });
    } else {
      // 播放内置声音
      playDefaultSound(soundFile);
    }
  }
  
  // 播放默认声音
  function playDefaultSound(soundFile = 'default.mp3') {
    try {
      const soundUrl = chrome.runtime.getURL(`sounds/${soundFile}`);
      
      // 使用AudioContext API播放声音，避免电流声
      fetch(soundUrl)
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          return audioContext.decodeAudioData(arrayBuffer);
        })
        .then(audioBuffer => {
          const source = audioContext.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(audioContext.destination);
          source.start(0);
        })
        .catch(error => {
          console.error("播放声音时出错:", error);
        });
    } catch (error) {
      console.error("创建音频对象时出错:", error);
    }
  }
  
  // 暂停/继续计时器
  function togglePause() {
    timerState.isPaused = !timerState.isPaused;
    
    if (timerState.isPaused) {
      // 暂停
      timerContainer.classList.add('paused');
    } else {
      // 继续
      timerContainer.classList.remove('paused');
      timerState.startTime = Date.now() - (timerState.elapsedTime * 1000);
    }
    
    updateBackgroundState();
  }
  
  // 重置计时器
  function resetTimer() {
    timerState.startTime = Date.now();
    timerState.elapsedTime = 0;
    timerState.isPaused = false;
    timerContainer.classList.remove('paused');
    
    updateTimerDisplay();
    updateBackgroundState();
  }
  
  // 切换计时器可见性
  function toggleVisibility() {
    timerState.isHidden = !timerState.isHidden;
    
    if (timerState.isHidden) {
      timerElement.style.display = 'none';
      timerContainer.classList.add('hidden');
    } else {
      timerElement.style.display = 'block';
      timerContainer.classList.remove('hidden');
    }
    
    updateBackgroundState();
  }
  
  // 更新后台状态
  function updateBackgroundState() {
    chrome.runtime.sendMessage({
      action: "updateTimer",
      elapsedTime: timerState.elapsedTime,
      elapsedMilliseconds: timerState.elapsedMilliseconds,
      isRunning: timerState.isRunning,
      isPaused: timerState.isPaused,
      isHidden: timerState.isHidden
    });
  }
  
  // 监听来自后台的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("收到消息:", message.action);
    
    switch (message.action) {
      case "pause":
        if (!timerState.isPaused) {
          console.log("暂停计时器");
          togglePause();
          sendResponse({ success: true, status: "paused" });
        } else {
          sendResponse({ success: true, status: "already_paused" });
        }
        break;
        
      case "forcePause":
        // 强制暂停，无论当前状态如何
        console.log("强制暂停计时器");
        timerState.isPaused = true;
        timerContainer.classList.add('paused');
        updateBackgroundState();
        sendResponse({ success: true, status: "force_paused" });
        break;
        
      case "resume":
        if (timerState.isPaused) {
          console.log("恢复计时器");
          togglePause(); // 取消暂停状态
          sendResponse({ success: true, status: "resumed" });
        } else {
          sendResponse({ success: true, status: "already_running" });
        }
        break;
        
      case "forceResume":
        console.log("强制恢复计时器");
        // 无论当前状态如何，都强制恢复计时
        timerState.isPaused = false;
        timerContainer.classList.remove('paused');
        
        // 如果后台有保存的时间数据，使用它
        if (message.timerData) {
          timerState.elapsedTime = message.timerData.elapsedTime;
          timerState.elapsedMilliseconds = message.timerData.elapsedTime * 1000;
        }
        
        // 更新开始时间，确保计时器从正确的时间点继续
        timerState.startTime = Date.now() - timerState.elapsedMilliseconds;
        
        // 更新显示
        updateTimerDisplay();
        updateBackgroundState();
        
        sendResponse({ success: true, status: "force_resumed" });
        break;
        
      case "reset":
        resetTimer();
        break;
        
      case "hide":
        if (!timerState.isHidden) {
          toggleVisibility();
        }
        break;
        
      case "show":
        if (timerState.isHidden) {
          toggleVisibility();
        }
        break;
    }
    
    // 返回true以支持异步响应
    return true;
  });
  
  // 暂停/继续计时器
  function togglePause() {
    timerState.isPaused = !timerState.isPaused;
    
    if (timerState.isPaused) {
      // 暂停
      timerContainer.classList.add('paused');
    } else {
      // 继续
      timerContainer.classList.remove('paused');
      timerState.startTime = Date.now() - (timerState.elapsedMilliseconds);
    }
    
    updateBackgroundState();
    console.log("计时器状态切换为:", timerState.isPaused ? "暂停" : "运行");
  }
  
  // 页面关闭或离开时保存历史记录
  window.addEventListener('beforeunload', () => {
    try {
      // 使用同步消息发送，确保在页面关闭前完成
      chrome.runtime.sendMessage({ 
        action: "saveHistory",
        sync: true  // 添加标记表示这是同步请求
      });
    } catch (e) {
      console.log("保存历史记录时出错:", e);
    }
  });
  
  // 页面加载完成后初始化
  window.addEventListener('load', initializeTimer);
  
  // 修改格式化时长函数，添加毫秒支持
  function formatDuration(milliseconds, short = false) {
    const seconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    const ms = Math.floor((milliseconds % 1000) / 10);
    
    if (short) {
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        return `${minutes}m ${remainingSeconds}s`;
      } else {
        return `${remainingSeconds}.${ms.toString().padStart(2, '0')}s`;
      }
    } else {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    }
  }