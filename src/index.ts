interface TradingData {
  volumeStatus: string;
  bollStatus: string;
  bollCoalesced: boolean;
  pattern: string;
}

function createApp() {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <div class="container">
      <h1 class="title">交易下单分级系统</h1>

      <div class="form-section">
        <h2 class="section-title">量能状态</h2>
        <div class="radio-group">
          <label class="radio-label">
            <input type="radio" name="volumeStatus" value="顶背离">
            <span>顶背离</span>
          </label>
          <label class="radio-label">
            <input type="radio" name="volumeStatus" value="底背离">
            <span>底背离</span>
          </label>
          <label class="radio-label">
            <input type="radio" name="volumeStatus" value="无趋势" checked>
            <span>无趋势</span>
          </label>
        </div>
      </div>

      <div class="form-section">
        <h2 class="section-title">BOLL 状态</h2>
        <div class="radio-group">
          <label class="radio-label">
            <input type="radio" name="bollStatus" value="1小时及以下收缩" checked>
            <span>1小时及以下收缩</span>
          </label>
          <label class="radio-label">
            <input type="radio" name="bollStatus" value="2小时收缩">
            <span>2小时收缩</span>
          </label>
          <label class="radio-label">
            <input type="radio" name="bollStatus" value="4小时收缩">
            <span>4小时收缩</span>
          </label>
          <label class="radio-label">
            <input type="radio" name="bollStatus" value="4小时及以上收缩">
            <span>4小时及以上收缩</span>
          </label>
        </div>
      </div>

      <div class="form-section">
        <h2 class="section-title">布林带宽度</h2>
        <div class="radio-group">
          <label class="radio-label">
            <input type="radio" name="bollCoalesced" value="是">
            <span>粘合</span>
          </label>
          <label class="radio-label">
            <input type="radio" name="bollCoalesced" value="否" checked>
            <span>未粘合</span>
          </label>
        </div>
      </div>

      <div class="form-section">
        <h2 class="section-title">形态</h2>
        <div class="radio-group">
          <label class="radio-label">
            <input type="radio" name="pattern" value="双肩顶底">
            <span>双肩顶底</span>
          </label>
          <label class="radio-label">
            <input type="radio" name="pattern" value="楔形">
            <span>楔形</span>
          </label>
          <label class="radio-label">
            <input type="radio" name="pattern" value="三角收敛">
            <span>三角收敛</span>
          </label>
          <label class="radio-label">
            <input type="radio" name="pattern" value="通道">
            <span>通道</span>
          </label>
          <label class="radio-label">
            <input type="radio" name="pattern" value="无" checked>
            <span>无</span>
          </label>
        </div>
      </div>

      <button id="evaluateBtn" class="evaluate-btn">生成评级</button>

      <div id="result" class="result hidden"></div>
    </div>
  `;

  const evaluateBtn = document.getElementById('evaluateBtn') as HTMLButtonElement;
  const resultDiv = document.getElementById('result') as HTMLDivElement;

  evaluateBtn.addEventListener('click', () => {
    const data = getFormData();
    const result = evaluateTrading(data);
    displayResult(result, data);
  });
}

function getFormData(): TradingData {
  const volumeStatus = document.querySelector('input[name="volumeStatus"]:checked') as HTMLInputElement;
  const bollStatus = document.querySelector('input[name="bollStatus"]:checked') as HTMLInputElement;
  const bollCoalesced = document.querySelector('input[name="bollCoalesced"]:checked') as HTMLInputElement;
  const pattern = document.querySelector('input[name="pattern"]:checked') as HTMLInputElement;

  return {
    volumeStatus: volumeStatus?.value || '无趋势',
    bollStatus: bollStatus?.value || '1小时及以下收缩',
    bollCoalesced: bollCoalesced?.value === '是',
    pattern: pattern?.value || '无'
  };
}

function evaluateTrading(data: TradingData): { grade: string; message: string } {
  const { volumeStatus, bollStatus, bollCoalesced } = data;

  // A级评级条件
  const isVolumeDivergence = volumeStatus === '顶背离' || volumeStatus === '底背离';
  const isLongerBoll = bollStatus === '2小时收缩' || bollStatus === '4小时收缩' || bollStatus === '4小时及以上收缩';
  
  if (isVolumeDivergence && isLongerBoll && bollCoalesced) {
    return {
      grade: 'A',
      message: '优秀交易机会，强烈建议操作'
    };
  }

  // B级评级条件
  const isShortBoll = bollStatus === '1小时及以下收缩';
  
  if (isVolumeDivergence && isShortBoll && bollCoalesced) {
    return {
      grade: 'B',
      message: '良好交易机会，可以操作'
    };
  }

  // C级评级条件
  return {
    grade: 'C',
    message: '不建议操作'
  };
}

function displayResult(result: { grade: string; message: string }, data: TradingData) {
  const resultDiv = document.getElementById('result') as HTMLDivElement;
  
  let gradeClass = '';
  let gradeText = '';

  switch (result.grade) {
    case 'A':
      gradeClass = 'grade-a';
      gradeText = 'A级';
      break;
    case 'B':
      gradeClass = 'grade-b';
      gradeText = 'B级';
      break;
    case 'C':
      gradeClass = 'grade-c';
      gradeText = 'C级';
      break;
  }

  resultDiv.innerHTML = `
    <div class="result-card ${gradeClass}">
      <h3 class="result-grade">${gradeText}</h3>
      <p class="result-message">${result.message}</p>
      
      <div class="result-details">
        <h4>当前选择：</h4>
        <p><strong>量能状态：</strong>${data.volumeStatus}</p>
        <p><strong>BOLL 状态：</strong>${data.bollStatus}</p>
        <p><strong>布林带宽度：</strong>${data.bollCoalesced ? '粘合' : '未粘合'}</p>
        <p><strong>形态：</strong>${data.pattern}</p>
      </div>
    </div>
  `;

  resultDiv.classList.remove('hidden');
}

// 启动应用
createApp();
