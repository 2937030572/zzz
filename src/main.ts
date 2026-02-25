import './index.css';

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
    <div class="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 py-4 px-6 flex items-center justify-center">
      <!-- 金融背景装饰 -->
      <div class="fixed inset-0 overflow-hidden pointer-events-none">
        <div class="absolute top-0 left-0 w-full h-full opacity-5">
          <div class="absolute top-10 left-10 text-9xl">📈</div>
          <div class="absolute bottom-10 right-10 text-9xl">📊</div>
          <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-9xl">💹</div>
        </div>
        <!-- 网格线条 -->
        <div class="absolute inset-0 opacity-10" style="background-image: linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px); background-size: 50px 50px;"></div>
      </div>

      <div class="max-w-7xl w-full mx-auto relative z-10">
        <!-- 主卡片 -->
        <div class="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl p-6 border border-yellow-500/30">
          <!-- 标题区域 -->
          <div class="text-center mb-4 pb-3 border-b border-yellow-500/20">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-full mb-2 shadow-lg border-2 border-yellow-400">
              <span class="text-3xl">💰</span>
            </div>
            <h1 class="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 tracking-wide">
              交易下单分级系统
            </h1>
          </div>

          <!-- 表单内容 - 三列布局 -->
          <div class="grid grid-cols-3 gap-5">
            <!-- 前两列：所有表单区块 -->
            <div class="col-span-2 grid grid-cols-2 gap-5">
              <!-- 量能状态 -->
              <div class="form-section bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 hover:border-yellow-500/30 transition-all duration-300">
                <div class="flex items-center gap-2 mb-3">
                  <div class="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/30">
                    <span class="text-xl">⚡</span>
                  </div>
                  <h2 class="text-base font-semibold text-white tracking-wide">
                    量能状态
                  </h2>
                </div>
                <div class="space-y-2">
                  <label class="option-card flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg cursor-pointer border-2 border-transparent hover:border-blue-400 transition-all duration-200">
                    <input type="radio" name="volumeStatus" value="顶背离" class="sr-only">
                    <span class="text-2xl">🔴</span>
                    <span class="text-white text-sm font-medium">顶背离</span>
                  </label>
                  <label class="option-card flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg cursor-pointer border-2 border-transparent hover:border-green-400 transition-all duration-200">
                    <input type="radio" name="volumeStatus" value="底背离" class="sr-only">
                    <span class="text-2xl">🟢</span>
                    <span class="text-white text-sm font-medium">底背离</span>
                  </label>
                  <label class="option-card flex items-center gap-3 p-3 bg-blue-500/20 rounded-lg cursor-pointer border-2 border-blue-400 transition-all duration-200">
                    <input type="radio" name="volumeStatus" value="无趋势" checked class="sr-only">
                    <span class="text-2xl">⚪</span>
                    <span class="text-white text-sm font-medium">无趋势</span>
                  </label>
                </div>
              </div>

              <!-- BOLL 状态 -->
              <div class="form-section bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 hover:border-yellow-500/30 transition-all duration-300">
                <div class="flex items-center gap-2 mb-3">
                  <div class="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center border border-purple-500/30">
                    <span class="text-xl">📏</span>
                  </div>
                  <h2 class="text-base font-semibold text-white tracking-wide">
                    BOLL 状态
                  </h2>
                </div>
                <div class="space-y-2">
                  <label class="option-card flex items-center gap-3 p-3 bg-blue-500/20 rounded-lg cursor-pointer border-2 border-blue-400 transition-all duration-200">
                    <input type="radio" name="bollStatus" value="1小时及以下收缩" checked class="sr-only">
                    <span class="text-2xl">⏱️</span>
                    <span class="text-white text-sm font-medium">1小时及以下收缩</span>
                  </label>
                  <label class="option-card flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg cursor-pointer border-2 border-transparent hover:border-purple-400 transition-all duration-200">
                    <input type="radio" name="bollStatus" value="2小时收缩" class="sr-only">
                    <span class="text-2xl">⏰</span>
                    <span class="text-white text-sm font-medium">2小时收缩</span>
                  </label>
                  <label class="option-card flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg cursor-pointer border-2 border-transparent hover:border-pink-400 transition-all duration-200">
                    <input type="radio" name="bollStatus" value="4小时及以上收缩" class="sr-only">
                    <span class="text-2xl">⌛</span>
                    <span class="text-white text-sm font-medium">4小时及以上收缩</span>
                  </label>
                </div>
              </div>

              <!-- 布林带宽度 -->
              <div class="form-section bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 hover:border-yellow-500/30 transition-all duration-300">
                <div class="flex items-center gap-2 mb-3">
                  <div class="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center border border-amber-500/30">
                    <span class="text-xl">🎯</span>
                  </div>
                  <h2 class="text-base font-semibold text-white tracking-wide">
                    布林带宽度
                  </h2>
                </div>
                <div class="space-y-2">
                  <label class="option-card flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg cursor-pointer border-2 border-transparent hover:border-amber-400 transition-all duration-200">
                    <input type="radio" name="bollCoalesced" value="是" class="sr-only">
                    <span class="text-2xl">✨</span>
                    <span class="text-white text-sm font-medium">粘合</span>
                  </label>
                  <label class="option-card flex items-center gap-3 p-3 bg-blue-500/20 rounded-lg cursor-pointer border-2 border-blue-400 transition-all duration-200">
                    <input type="radio" name="bollCoalesced" value="否" checked class="sr-only">
                    <span class="text-2xl">📊</span>
                    <span class="text-white text-sm font-medium">未粘合</span>
                  </label>
                </div>
              </div>

              <!-- 形态 -->
              <div class="form-section bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 hover:border-yellow-500/30 transition-all duration-300">
                <div class="flex items-center gap-2 mb-3">
                  <div class="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center border border-cyan-500/30">
                    <span class="text-xl">🔷</span>
                  </div>
                  <h2 class="text-base font-semibold text-white tracking-wide">
                    形态
                  </h2>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <label class="option-card flex items-center gap-2 p-2 bg-slate-700/50 rounded-lg cursor-pointer border-2 border-transparent hover:border-red-400 transition-all duration-200">
                    <input type="radio" name="pattern" value="头肩顶（底）" class="sr-only">
                    <span class="text-xl">🏔️</span>
                    <span class="text-white text-xs font-medium">头肩</span>
                  </label>
                  <label class="option-card flex items-center gap-2 p-2 bg-slate-700/50 rounded-lg cursor-pointer border-2 border-transparent hover:border-orange-400 transition-all duration-200">
                    <input type="radio" name="pattern" value="双顶底" class="sr-only">
                    <span class="text-xl">👥</span>
                    <span class="text-white text-xs font-medium">双顶底</span>
                  </label>
                  <label class="option-card flex items-center gap-2 p-2 bg-slate-700/50 rounded-lg cursor-pointer border-2 border-transparent hover:border-purple-400 transition-all duration-200">
                    <input type="radio" name="pattern" value="三重顶（底）" class="sr-only">
                    <span class="text-xl">⛰️</span>
                    <span class="text-white text-xs font-medium">三重</span>
                  </label>
                  <label class="option-card flex items-center gap-2 p-2 bg-slate-700/50 rounded-lg cursor-pointer border-2 border-transparent hover:border-cyan-400 transition-all duration-200">
                    <input type="radio" name="pattern" value="三角" class="sr-only">
                    <span class="text-xl">🔺</span>
                    <span class="text-white text-xs font-medium">三角</span>
                  </label>
                  <label class="option-card flex items-center gap-2 p-2 bg-slate-700/50 rounded-lg cursor-pointer border-2 border-transparent hover:border-amber-400 transition-all duration-200">
                    <input type="radio" name="pattern" value="杯柄" class="sr-only">
                    <span class="text-xl">☕</span>
                    <span class="text-white text-xs font-medium">杯柄</span>
                  </label>
                  <label class="option-card flex items-center gap-2 p-2 bg-slate-700/50 rounded-lg cursor-pointer border-2 border-transparent hover:border-green-400 transition-all duration-200">
                    <input type="radio" name="pattern" value="通道" class="sr-only">
                    <span class="text-xl">📉</span>
                    <span class="text-white text-xs font-medium">通道</span>
                  </label>
                  <label class="option-card flex items-center gap-2 p-2 col-span-2 bg-blue-500/20 rounded-lg cursor-pointer border-2 border-blue-400 transition-all duration-200">
                    <input type="radio" name="pattern" value="无" checked class="sr-only">
                    <span class="text-xl">❌</span>
                    <span class="text-white text-xs font-medium">无</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- 第三列：竖着排列的按钮 -->
            <div class="flex flex-col justify-center gap-4">
              <div class="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
                <div class="text-center mb-4">
                  <div class="w-14 h-14 bg-gradient-to-br from-yellow-500/20 to-amber-600/20 rounded-full mx-auto mb-3 flex items-center justify-center border-2 border-yellow-500/30">
                    <span class="text-3xl">⚙️</span>
                  </div>
                  <h3 class="text-lg font-semibold text-white">操作面板</h3>
                  <p class="text-slate-400 text-sm mt-1">完成参数选择后点击生成</p>
                </div>
                
                <button id="evaluateBtn" class="w-full bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 hover:from-yellow-600 hover:via-amber-600 hover:to-yellow-700 text-slate-900 font-bold py-5 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 border-2 border-yellow-400 mb-3">
                  <span class="text-2xl">📊</span>
                  <span class="text-lg">生成评级</span>
                </button>

                <button id="resetBtn" class="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 border border-slate-600">
                  <span class="text-xl">🔄</span>
                  <span class="text-sm">重置选择</span>
                </button>
              </div>

              <!-- 提示信息 -->
              <div class="bg-slate-800/50 rounded-lg p-5 border border-slate-700/50">
                <div class="flex items-start gap-3">
                  <span class="text-2xl">💡</span>
                  <div>
                    <h4 class="text-sm font-semibold text-white mb-1">使用提示</h4>
                    <p class="text-slate-400 text-xs leading-relaxed">
                      根据量能、BOLL、布林带宽度和形态自动评级。A+级为最高质量交易机会。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 弹窗模态框 -->
    <div id="resultModal" class="fixed inset-0 z-50 hidden">
      <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" id="modalOverlay"></div>
      <div class="absolute inset-0 flex items-center justify-center p-6">
        <div id="modalContent" class="relative w-full max-w-2xl bg-slate-900 rounded-2xl shadow-2xl border-2 border-yellow-500/30 transform transition-all duration-300 scale-95 opacity-0">
          <!-- 关闭按钮 -->
          <button id="closeModal" class="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
          
          <!-- 评级内容 -->
          <div id="modalResult" class="p-8">
            <!-- 动态内容 -->
          </div>
        </div>
      </div>
    </div>
  `;

  // 初始化选项卡片样式
  initializeOptionCards();

  const evaluateBtn = document.getElementById('evaluateBtn') as HTMLButtonElement;
  const resultModal = document.getElementById('resultModal') as HTMLDivElement;
  const modalOverlay = document.getElementById('modalOverlay') as HTMLDivElement;
  const closeModal = document.getElementById('closeModal') as HTMLButtonElement;
  const modalContent = document.getElementById('modalContent') as HTMLDivElement;

  evaluateBtn.addEventListener('click', () => {
    const data = getFormData();
    const result = evaluateTrading(data);
    showModalResult(result, data);
  });

  closeModal.addEventListener('click', hideModal);
  modalOverlay.addEventListener('click', hideModal);

  function showModalResult(result: { grade: string; message: string; emoji: string; qualifies: boolean }, data: TradingData) {
    const modalResult = document.getElementById('modalResult') as HTMLDivElement;
    
    let gradeClass = '';
    let gradeText = '';
    let iconBg = '';
    let borderColor = '';
    let statusColor = '';
    let statusText = '';

    switch (result.grade) {
      case 'A+':
        gradeClass = 'grade-a-plus';
        gradeText = 'A+级';
        iconBg = 'bg-amber-500/20 border-amber-400';
        borderColor = 'border-amber-500/50';
        statusColor = 'text-amber-400';
        statusText = '🏆 卓越';
        break;
      case 'A':
        gradeClass = 'grade-a';
        gradeText = 'A级';
        iconBg = 'bg-yellow-500/20 border-yellow-400';
        borderColor = 'border-yellow-500/50';
        statusColor = 'text-yellow-400';
        statusText = '⭐ 优秀';
        break;
      case 'A-':
        gradeClass = 'grade-a-minus';
        gradeText = 'A-级';
        iconBg = 'bg-orange-500/20 border-orange-400';
        borderColor = 'border-orange-500/50';
        statusColor = 'text-orange-400';
        statusText = '💫 优秀谨慎';
        break;
      case 'B+':
        gradeClass = 'grade-b-plus';
        gradeText = 'B+级';
        iconBg = 'bg-emerald-500/20 border-emerald-400';
        borderColor = 'border-emerald-500/50';
        statusColor = 'text-emerald-400';
        statusText = '🌟 优秀良好';
        break;
      case 'B':
        gradeClass = 'grade-b';
        gradeText = 'B级';
        iconBg = 'bg-blue-500/20 border-blue-400';
        borderColor = 'border-blue-500/50';
        statusColor = 'text-blue-400';
        statusText = '✅ 良好';
        break;
      case 'B-':
        gradeClass = 'grade-b-minus';
        gradeText = 'B-级';
        iconBg = 'bg-sky-500/20 border-sky-400';
        borderColor = 'border-sky-500/50';
        statusColor = 'text-sky-400';
        statusText = '📊 一般';
        break;
      case 'C':
        gradeClass = 'grade-c';
        gradeText = 'C级';
        iconBg = 'bg-gray-500/20 border-gray-400';
        borderColor = 'border-gray-500/50';
        statusColor = 'text-gray-400';
        statusText = '⚠️ 不建议';
        break;
    }

    modalResult.innerHTML = `
      <div class="result-card ${gradeClass} rounded-2xl p-6 shadow-2xl border ${borderColor} bg-slate-800/80">
        <div class="flex items-center gap-6 mb-5">
          <div class="w-24 h-24 ${iconBg} rounded-xl flex items-center justify-center border-2">
            <span class="text-6xl">${result.emoji}</span>
          </div>
          <div class="flex-1">
            <div class="flex items-center gap-4 mb-2">
              <h3 class="text-7xl font-black text-white tracking-wider drop-shadow-lg">${gradeText}</h3>
              <span class="text-sm font-semibold px-3 py-1 rounded-full ${statusColor} bg-slate-700/50 border border-slate-600">
                ${statusText}
              </span>
            </div>
            <p class="text-white/90 text-xl font-semibold">${result.message}</p>
          </div>
        </div>
        
        <div class="result-details bg-slate-900/50 rounded-xl p-5 mt-5 border border-slate-700/50">
          <h4 class="font-semibold mb-4 text-white flex items-center gap-2 text-base">
            <span>📋</span> 当前参数选择
          </h4>
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-slate-800/50 rounded-lg p-4 border border-slate-700/30">
              <p class="text-gray-500 text-sm mb-2 uppercase tracking-wider">量能状态</p>
              <p class="text-white text-base font-semibold">${data.volumeStatus}</p>
            </div>
            <div class="bg-slate-800/50 rounded-lg p-4 border border-slate-700/30">
              <p class="text-gray-500 text-sm mb-2 uppercase tracking-wider">BOLL 状态</p>
              <p class="text-white text-base font-semibold">${data.bollStatus}</p>
            </div>
            <div class="bg-slate-800/50 rounded-lg p-4 border border-slate-700/30">
              <p class="text-gray-500 text-sm mb-2 uppercase tracking-wider">布林带宽度</p>
              <p class="text-white text-base font-semibold">${data.bollCoalesced ? '粘合' : '未粘合'}</p>
            </div>
            <div class="bg-slate-800/50 rounded-lg p-4 border border-slate-700/30">
              <p class="text-gray-500 text-sm mb-2 uppercase tracking-wider">形态</p>
              <p class="text-white text-base font-semibold">${data.pattern}</p>
            </div>
          </div>
        </div>
      </div>
    `;

    resultModal.classList.remove('hidden');
    modalContent.classList.remove('scale-95', 'opacity-0');
    modalContent.classList.add('scale-100', 'opacity-100');
  }

  function hideModal() {
    const resultModal = document.getElementById('resultModal') as HTMLDivElement;
    const modalContent = document.getElementById('modalContent') as HTMLDivElement;
    
    modalContent.classList.remove('scale-100', 'opacity-100');
    modalContent.classList.add('scale-95', 'opacity-0');
    
    setTimeout(() => {
      resultModal.classList.add('hidden');
    }, 300);
  }
}

function initializeOptionCards() {
  const optionCards = document.querySelectorAll('.option-card');
  optionCards.forEach(card => {
    const input = card.querySelector('input[type="radio"]') as HTMLInputElement;
    
    if (input.checked) {
      card.classList.remove('bg-slate-700/50', 'border-transparent');
      card.classList.add('bg-blue-500/20', 'border-blue-400');
    }

    input.addEventListener('change', () => {
      const groupName = input.name;
      document.querySelectorAll(`input[name="${groupName}"]`).forEach(radio => {
        const parentRadio = radio.closest('.option-card');
        if (parentRadio) {
          parentRadio.classList.remove('bg-blue-500/20', 'border-blue-400');
          parentRadio.classList.add('bg-slate-700/50', 'border-transparent');
        }
      });

      if (input.checked) {
        const currentCard = input.closest('.option-card');
        if (currentCard) {
          currentCard.classList.remove('bg-slate-700/50', 'border-transparent');
          currentCard.classList.add('bg-blue-500/20', 'border-blue-400');
        }
      }
    });
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

function evaluateTrading(data: TradingData): { grade: string; message: string; emoji: string; qualifies: boolean } {
  const { volumeStatus, bollStatus, bollCoalesced, pattern } = data;

  const isVolumeDivergence = volumeStatus === '顶背离' || volumeStatus === '底背离';
  const is4HoursOrMore = bollStatus === '4小时及以上收缩';
  const is2HoursOrLess = bollStatus === '1小时及以下收缩' || bollStatus === '2小时收缩';
  const hasPattern = pattern !== '无';
  
  if (isVolumeDivergence && is4HoursOrMore) {
    if (bollCoalesced && hasPattern) {
      return {
        grade: 'A+',
        message: '卓越交易机会（形态确认），强烈建议操作',
        emoji: '🏆',
        qualifies: true
      };
    }
    
    if (bollCoalesced && !hasPattern) {
      return {
        grade: 'A',
        message: '优秀交易机会，强烈建议操作',
        emoji: '⭐',
        qualifies: true
      };
    }
    
    if (!bollCoalesced) {
      return {
        grade: 'A-',
        message: '优秀交易机会，布林带未粘合，建议谨慎操作',
        emoji: '💫',
        qualifies: true
      };
    }
  }

  if (isVolumeDivergence && is2HoursOrLess) {
    if (bollCoalesced && hasPattern) {
      return {
        grade: 'B+',
        message: '良好交易机会（形态确认），可以操作',
        emoji: '🌟',
        qualifies: true
      };
    }
    
    if (bollCoalesced && !hasPattern) {
      return {
        grade: 'B',
        message: '良好交易机会，可以操作',
        emoji: '✅',
        qualifies: true
      };
    }
    
    if (!bollCoalesced) {
      return {
        grade: 'B-',
        message: '一般交易机会，布林带未粘合，建议谨慎操作',
        emoji: '📊',
        qualifies: true
      };
    }
  }

  return {
    grade: 'C',
    message: '不建议操作',
    emoji: '⚠️',
    qualifies: true
  };
}

createApp();
