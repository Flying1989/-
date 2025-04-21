document.addEventListener('DOMContentLoaded', function() {
    // DOM 元素
    const historyBody = document.getElementById('historyBody');
    const pagination = document.getElementById('pagination');
    const dateFromInput = document.getElementById('dateFrom');
    const dateToInput = document.getElementById('dateTo');
    const domainFilterInput = document.getElementById('domainFilter');
    const sortBySelect = document.getElementById('sortBy');
    const applyFiltersBtn = document.getElementById('applyFilters');
    const exportDataBtn = document.getElementById('exportData');
    const clearHistoryBtn = document.getElementById('clearHistory');
    const chartContainer = document.getElementById('chartContainer');
    
    // 分页设置
    const itemsPerPage = 20;
    let currentPage = 1;
    
    // 历史数据
    let historyData = [];
    let filteredData = [];
    
    // 初始化日期筛选器
    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(today.getMonth() - 1);
    
    dateToInput.valueAsDate = today;
    dateFromInput.valueAsDate = oneMonthAgo;
    
    // 加载历史数据
    loadHistoryData();
    
    // 应用筛选按钮
    applyFiltersBtn.addEventListener('click', function() {
      applyFilters();
    });
    
    // 导出数据按钮
    exportDataBtn.addEventListener('click', function() {
      exportData();
    });
    
    // 清除历史记录按钮
    clearHistoryBtn.addEventListener('click', function() {
      if (confirm('确定要清除所有历史记录吗？此操作不可撤销。')) {
        chrome.storage.local.set({ history: [] }, function() {
          historyData = [];
          filteredData = [];
          renderHistoryTable();
          renderChart();
          alert('历史记录已清除！');
        });
      }
    });
    
    // 加载历史数据
    function loadHistoryData() {
      chrome.storage.local.get('history', function(data) {
        historyData = data.history || [];
        applyFilters();
      });
    }
    
    // 应用筛选
    function applyFilters() {
      const dateFrom = dateFromInput.valueAsDate;
      const dateTo = dateToInput.valueAsDate;
      // 设置结束日期为当天的23:59:59
      dateTo.setHours(23, 59, 59, 999);
      
      const domainFilter = domainFilterInput.value.toLowerCase();
      const sortBy = sortBySelect.value;
      
      // 筛选数据
      filteredData = historyData.filter(function(item) {
        const itemDate = new Date(item.date);
        const matchesDate = itemDate >= dateFrom && itemDate <= dateTo;
        
        let matchesDomain = true;
        if (domainFilter) {
          try {
            const url = new URL(item.url);
            matchesDomain = url.hostname.toLowerCase().includes(domainFilter);
          } catch (e) {
            matchesDomain = item.url.toLowerCase().includes(domainFilter);
          }
        }
        
        return matchesDate && matchesDomain;
      });
      
      // 排序数据
      filteredData.sort(function(a, b) {
        switch (sortBy) {
          case 'date-desc':
            return new Date(b.date) - new Date(a.date);
          case 'date-asc':
            return new Date(a.date) - new Date(b.date);
          case 'duration-desc':
            return b.duration - a.duration;
          case 'duration-asc':
            return a.duration - b.duration;
          default:
            return new Date(b.date) - new Date(a.date);
        }
      });
      
      // 重置到第一页
      currentPage = 1;
      
      // 渲染表格和图表
      renderHistoryTable();
      renderChart();
    }
    
    // 渲染历史表格
    function renderHistoryTable() {
      historyBody.innerHTML = '';
      
      if (filteredData.length === 0) {
        const noDataRow = document.createElement('tr');
        const noDataCell = document.createElement('td');
        noDataCell.colSpan = 4;
        noDataCell.textContent = '没有找到匹配的历史记录';
        noDataCell.className = 'no-data';
        noDataRow.appendChild(noDataCell);
        historyBody.appendChild(noDataRow);
        
        // 隐藏分页
        pagination.style.display = 'none';
        return;
      }
      
      // 计算分页
      const totalPages = Math.ceil(filteredData.length / itemsPerPage);
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = Math.min(startIndex + itemsPerPage, filteredData.length);
      
      // 渲染当前页数据
      for (let i = startIndex; i < endIndex; i++) {
        const item = filteredData[i];
        const row = document.createElement('tr');
        
        // 日期列
        const dateCell = document.createElement('td');
        const date = new Date(item.date);
        dateCell.textContent = date.toLocaleString();
        
        // 网站列
        const urlCell = document.createElement('td');
        try {
          const url = new URL(item.url);
          urlCell.textContent = url.hostname;
        } catch (e) {
          urlCell.textContent = item.url;
        }
        
        // 标题列
        const titleCell = document.createElement('td');
        titleCell.textContent = item.title || '无标题';
        
        // 时长列
        const durationCell = document.createElement('td');
        durationCell.textContent = formatDuration(item.duration);
        
        row.appendChild(dateCell);
        row.appendChild(urlCell);
        row.appendChild(titleCell);
        row.appendChild(durationCell);
        
        historyBody.appendChild(row);
      }
      
      // 渲染分页
      renderPagination(totalPages);
    }
    
    // 渲染分页
    function renderPagination(totalPages) {
      pagination.innerHTML = '';
      pagination.style.display = 'flex';
      
      if (totalPages <= 1) {
        pagination.style.display = 'none';
        return;
      }
      
      // 上一页按钮
      const prevButton = document.createElement('button');
      prevButton.textContent = '上一页';
      prevButton.disabled = currentPage === 1;
      prevButton.addEventListener('click', function() {
        if (currentPage > 1) {
          currentPage--;
          renderHistoryTable();
        }
      });
      pagination.appendChild(prevButton);
      
      // 页码按钮
      const maxButtons = 5;
      const startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
      const endPage = Math.min(totalPages, startPage + maxButtons - 1);
      
      for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.className = i === currentPage ? 'active' : '';
        pageButton.addEventListener('click', function() {
          currentPage = i;
          renderHistoryTable();
        });
        pagination.appendChild(pageButton);
      }
      
      // 下一页按钮
      const nextButton = document.createElement('button');
      nextButton.textContent = '下一页';
      nextButton.disabled = currentPage === totalPages;
      nextButton.addEventListener('click', function() {
        if (currentPage < totalPages) {
          currentPage++;
          renderHistoryTable();
        }
      });
      pagination.appendChild(nextButton);
    }
    
    // 渲染图表
    function renderChart() {
      chartContainer.innerHTML = '';
      
      if (filteredData.length === 0) {
        chartContainer.textContent = '没有数据可供显示';
        return;
      }
      
      // 按域名分组数据
      const domainData = {};
      filteredData.forEach(function(item) {
        let domain;
        try {
          domain = new URL(item.url).hostname;
        } catch (e) {
          domain = '未知域名';
        }
        
        if (!domainData[domain]) {
          domainData[domain] = 0;
        }
        domainData[domain] += item.duration;
      });
      
      // 转换为数组并排序
      const sortedData = Object.entries(domainData)
        .map(([domain, duration]) => ({ domain, duration }))
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10); // 只显示前10个
      
      // 创建简单的条形图
      const chartHeight = 250;
      const chartWidth = chartContainer.clientWidth;
      const barWidth = Math.min(50, (chartWidth - 100) / sortedData.length);
      const maxDuration = Math.max(...sortedData.map(item => item.duration));
      
      const chart = document.createElement('div');
      chart.style.height = `${chartHeight}px`;
      chart.style.display = 'flex';
      chart.style.alignItems = 'flex-end';
      chart.style.justifyContent = 'center';
      chart.style.gap = '10px';
      chart.style.padding = '0 20px';
      
      sortedData.forEach(function(item) {
        const barHeight = (item.duration / maxDuration) * chartHeight;
        
        const barContainer = document.createElement('div');
        barContainer.style.display = 'flex';
        barContainer.style.flexDirection = 'column';
        barContainer.style.alignItems = 'center';
        barContainer.style.width = `${barWidth}px`;
        
        const bar = document.createElement('div');
        bar.style.width = '100%';
        bar.style.height = `${barHeight}px`;
        bar.style.backgroundColor = '#4285f4';
        bar.style.borderRadius = '4px 4px 0 0';
        bar.title = `${item.domain}: ${formatDuration(item.duration)}`;
        
        const label = document.createElement('div');
        label.textContent = item.domain.replace(/^www\./, '').split('.')[0];
        label.style.fontSize = '12px';
        label.style.marginTop = '5px';
        label.style.textAlign = 'center';
        label.style.overflow = 'hidden';
        label.style.textOverflow = 'ellipsis';
        label.style.whiteSpace = 'nowrap';
        label.style.width = '100%';
        
        const duration = document.createElement('div');
        duration.textContent = formatDuration(item.duration, true);
        duration.style.fontSize = '10px';
        duration.style.color = '#777';
        
        barContainer.appendChild(bar);
        barContainer.appendChild(label);
        barContainer.appendChild(duration);
        
        chart.appendChild(barContainer);
      });
      
      const title = document.createElement('h3');
      title.textContent = '访问时长最多的网站（前10名）';
      title.style.textAlign = 'center';
      title.style.marginBottom = '20px';
      
      chartContainer.appendChild(title);
      chartContainer.appendChild(chart);
    }
    
    // 导出数据
    function exportData() {
      if (filteredData.length === 0) {
        alert('没有数据可供导出！');
        return;
      }
      
      // 转换为CSV格式
      const headers = ['日期', '网站', '标题', '浏览时长（秒）'];
      const csvRows = [headers.join(',')];
      
      filteredData.forEach(function(item) {
        let domain;
        try {
          domain = new URL(item.url).hostname;
        } catch (e) {
          domain = item.url;
        }
        
        const row = [
          new Date(item.date).toLocaleString(),
          domain,
          `"${(item.title || '无标题').replace(/"/g, '""')}"`,
          item.duration
        ];
        
        csvRows.push(row.join(','));
      });
      
      const csvContent = csvRows.join('\n');
    
      // 创建下载链接
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `浏览历史记录_${new Date().toLocaleDateString()}.csv`);
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    
    // 格式化时长
    function formatDuration(seconds, short = false) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainingSeconds = seconds % 60;
      
      if (short) {
        if (hours > 0) {
          return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
          return `${minutes}m ${remainingSeconds}s`;
        } else {
          return `${remainingSeconds}s`;
        }
      } else {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
      }
    }
});