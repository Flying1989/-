document.addEventListener('DOMContentLoaded', function() {
    // DOM 元素
    const timePointsBody = document.getElementById('timePointsBody');
    const soundAlertsBody = document.getElementById('soundAlertsBody');
    const addTimePointBtn = document.getElementById('addTimePoint');
    const addSoundAlertBtn = document.getElementById('addSoundAlert');
    const pauseOnTabSwitchCheckbox = document.getElementById('pauseOnTabSwitch');
    const continueTimingWhenHiddenCheckbox = document.getElementById('continueTimingWhenHidden');
    const saveSettingsBtn = document.getElementById('saveSettings');
    const previewTimer = document.getElementById('previewTimer');
    
    // 当前设置
    let currentSettings = {
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
    
    // 加载设置
    loadSettings();
    
    // 添加时间点按钮
    addTimePointBtn.addEventListener('click', function() {
      currentSettings.timePoints.push({
        time: 0,
        color: "#FFFFFF",
        size: 1.0,
        widthPercent: 5
      });
      renderTimePoints();
    });
    
    // 添加声音提醒按钮
    addSoundAlertBtn.addEventListener('click', function() {
      currentSettings.soundAlerts.push({
        time: 0,
        sound: "default.mp3"
      });
      renderSoundAlerts();
    });
    
    // 保存设置按钮
    saveSettingsBtn.addEventListener('click', function() {
      saveSettings();
    });
    
    // 加载设置
    function loadSettings() {
      chrome.storage.local.get('settings', function(data) {
        if (data.settings) {
          currentSettings = data.settings;
        }
        
        // 渲染设置
        renderTimePoints();
        renderSoundAlerts();
        
        // 设置复选框
        pauseOnTabSwitchCheckbox.checked = currentSettings.pauseOnTabSwitch;
        continueTimingWhenHiddenCheckbox.checked = currentSettings.continueTimingWhenHidden;
      });
    }
    
    // 保存设置
    function saveSettings() {
      // 收集时间点数据
      currentSettings.timePoints = [];
      const timePointRows = timePointsBody.querySelectorAll('tr');
      timePointRows.forEach(function(row) {
        const time = parseInt(row.querySelector('.time-input').value);
        const color = row.querySelector('.color-input').value;
        const size = parseFloat(row.querySelector('.size-input').value);
        const widthPercent = parseInt(row.querySelector('.width-input').value);
        
        currentSettings.timePoints.push({
          time: time,
          color: color,
          size: size,
          widthPercent: widthPercent
        });
      });
      
      // 收集声音提醒数据
      currentSettings.soundAlerts = [];
      const soundAlertRows = soundAlertsBody.querySelectorAll('tr');
      soundAlertRows.forEach(function(row) {
        const time = parseInt(row.querySelector('.time-input').value);
        const sound = row.querySelector('.sound-select').value;
        
        currentSettings.soundAlerts.push({
          time: time,
          sound: sound
        });
      });
      
      // 收集一般设置
      currentSettings.pauseOnTabSwitch = pauseOnTabSwitchCheckbox.checked;
      currentSettings.continueTimingWhenHidden = continueTimingWhenHiddenCheckbox.checked;
      
      // 保存到存储
      chrome.storage.local.set({ settings: currentSettings }, function() {
        alert('设置已保存！');
      });
    }
    
    // 渲染时间点
    function renderTimePoints() {
      timePointsBody.innerHTML = '';
      
      currentSettings.timePoints.forEach(function(point, index) {
        const row = document.createElement('tr');
        
        // 时间输入
        const timeCell = document.createElement('td');
        const timeInput = document.createElement('input');
        timeInput.type = 'number';
        timeInput.className = 'time-input';
        timeInput.value = point.time;
        timeInput.min = 0;
        timeInput.addEventListener('input', function() {
          updatePreview(index);
        });
        timeCell.appendChild(timeInput);
        
        // 颜色输入
        const colorCell = document.createElement('td');
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.className = 'color-input';
        colorInput.value = point.color;
        colorInput.addEventListener('input', function() {
          updatePreview(index);
        });
        colorCell.appendChild(colorInput);
        
        // 字体大小输入
        const sizeCell = document.createElement('td');
        const sizeInput = document.createElement('input');
        sizeInput.type = 'number';
        sizeInput.className = 'size-input';
        sizeInput.value = point.size;
        sizeInput.min = 0.5;
        sizeInput.max = 5;
        sizeInput.step = 0.1;
        sizeInput.addEventListener('input', function() {
          updatePreview(index);
        });
        sizeCell.appendChild(sizeInput);
        
        // 宽度百分比输入
        const widthCell = document.createElement('td');
        const widthInput = document.createElement('input');
        widthInput.type = 'number';
        widthInput.className = 'width-input';
        widthInput.value = point.widthPercent;
        widthInput.min = 1;
        widthInput.max = 50;
        widthInput.addEventListener('input', function() {
          updatePreview(index);
        });
        widthCell.appendChild(widthInput);
        
        // 删除按钮
        const actionCell = document.createElement('td');
        const deleteButton = document.createElement('button');
        deleteButton.textContent = '删除';
        deleteButton.className = 'delete-button';
        deleteButton.addEventListener('click', function() {
          if (currentSettings.timePoints.length > 1) {
            currentSettings.timePoints.splice(index, 1);
            renderTimePoints();
          } else {
            alert('至少需要保留一个时间点！');
          }
        });
        actionCell.appendChild(deleteButton);
        
        // 添加到行
        row.appendChild(timeCell);
        row.appendChild(colorCell);
        row.appendChild(sizeCell);
        row.appendChild(widthCell);
        row.appendChild(actionCell);
        
        // 添加到表格
        timePointsBody.appendChild(row);
      });
    }
    
    // 渲染声音提醒
    function renderSoundAlerts() {
      soundAlertsBody.innerHTML = '';
      
      currentSettings.soundAlerts.forEach(function(alert, index) {
        const row = document.createElement('tr');
        
        // 时间输入
        const timeCell = document.createElement('td');
        const timeInput = document.createElement('input');
        timeInput.type = 'number';
        timeInput.className = 'time-input';
        timeInput.value = alert.time;
        timeInput.min = 0;
        timeCell.appendChild(timeInput);
        
        // 声音选择
        const soundCell = document.createElement('td');
        const soundSelect = document.createElement('select');
        soundSelect.className = 'sound-select';
        
        // 添加默认选项
        const defaultOption = document.createElement('option');
        defaultOption.value = 'default.mp3';
        defaultOption.textContent = '默认提示音';
        soundSelect.appendChild(defaultOption);
        
        // 设置当前值
        soundSelect.value = alert.sound;
        
        // 添加上传按钮
        const uploadButton = document.createElement('button');
        uploadButton.textContent = '上传声音';
        uploadButton.style.marginLeft = '10px';
        uploadButton.addEventListener('click', function() {
          // 创建文件输入
          const fileInput = document.createElement('input');
          fileInput.type = 'file';
          fileInput.accept = 'audio/*';
          fileInput.style.display = 'none';
          
          fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
              // 处理上传的声音文件
              const soundName = `custom_${Date.now()}.${file.name.split('.').pop()}`;
              
              // 使用 FileReader 读取文件内容
              const reader = new FileReader();
              reader.onload = function(event) {
                try {
                  const soundData = event.target.result;
                  
                  // 保存到存储
                  chrome.storage.local.get('customSounds', function(data) {
                    const customSounds = data.customSounds || {};
                    customSounds[soundName] = soundData;
                    
                    // 使用回调处理可能的错误
                    chrome.storage.local.set({ customSounds: customSounds }, function() {
                      if (chrome.runtime.lastError) {
                        console.error("保存声音文件时出错:", chrome.runtime.lastError);
                        alert("保存声音文件时出错: " + chrome.runtime.lastError.message);
                        return;
                      }
                      
                      // 添加到选择框
                      const newOption = document.createElement('option');
                      newOption.value = soundName;
                      newOption.textContent = file.name;
                      soundSelect.appendChild(newOption);
                      soundSelect.value = soundName;
                    });
                  });
                } catch (error) {
                  console.error("处理声音文件时出错:", error);
                  alert("处理声音文件时出错: " + error.message);
                }
              };
              
              reader.onerror = function(error) {
                console.error("读取声音文件时出错:", error);
                alert("读取声音文件时出错");
              };
              
              // 以DataURL格式读取文件
              reader.readAsDataURL(file);
            }
          });
          
          document.body.appendChild(fileInput);
          fileInput.click();
          document.body.removeChild(fileInput);
        });
        
        soundCell.appendChild(soundSelect);
        soundCell.appendChild(uploadButton);
        
        // 删除按钮
        const actionCell = document.createElement('td');
        const deleteButton = document.createElement('button');
        deleteButton.textContent = '删除';
        deleteButton.className = 'delete-button';
        deleteButton.addEventListener('click', function() {
          currentSettings.soundAlerts.splice(index, 1);
          renderSoundAlerts();
        });
        actionCell.appendChild(deleteButton);
        
        // 添加到行
        row.appendChild(timeCell);
        row.appendChild(soundCell);
        row.appendChild(actionCell);
        
        // 添加到表格
        soundAlertsBody.appendChild(row);
      });
      
      // 加载自定义声音
      loadCustomSounds();
    }
    
    // 加载自定义声音
    function loadCustomSounds() {
      chrome.storage.local.get('customSounds', function(data) {
        if (data.customSounds) {
          const soundSelects = document.querySelectorAll('.sound-select');
          
          soundSelects.forEach(function(select) {
            // 清除除默认选项外的所有选项
            while (select.options.length > 1) {
              select.remove(1);
            }
            
            // 添加自定义声音选项
            for (const [name, data] of Object.entries(data.customSounds)) {
              const option = document.createElement('option');
              option.value = name;
              option.textContent = name.replace('custom_', '').replace('.mp3', '');
              select.appendChild(option);
            }
          });
        }
      });
    }
    
    // 更新预览
    function updatePreview(index) {
      const rows = timePointsBody.querySelectorAll('tr');
      const row = rows[index];
      
      if (row) {
        const color = row.querySelector('.color-input').value;
        const size = row.querySelector('.size-input').value;
        const width = row.querySelector('.width-input').value;
        
        previewTimer.style.color = color;
        previewTimer.style.fontSize = `${size}rem`;
        previewTimer.style.width = `${width}%`;
      }
    }
  });