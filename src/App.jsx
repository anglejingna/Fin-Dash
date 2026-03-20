import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowUpRight, ArrowDownRight, Wallet, Plus, Minus, Settings, 
  Bell, Search, ChevronRight, ChevronLeft, X, Trash2, Save, Smile, AlertCircle, Info, TrendingUp, Download, Sun, Moon
} from 'lucide-react';

export default function App() {
  
  // Date Helpers
  const todayDate = new Date();
  const year = todayDate.getFullYear();
  const month = String(todayDate.getMonth() + 1).padStart(2, '0');
  const day = String(todayDate.getDate()).padStart(2, '0');
  const todayForInput = `${year}-${month}-${day}`;

  // Theme Management (Light/Dark Mode)
  const [theme, setTheme] = useState(() => {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('profitpop_theme')) {
      return localStorage.getItem('profitpop_theme');
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('profitpop_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  // --- 💾 1. State & LocalStorage ---
  const [expenseCategories, setExpenseCategories] = useState(() => {
    const saved = localStorage.getItem('profitpop_exp_cats');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map(c => typeof c === 'string' ? { name: c, limit: 0 } : c);
    }
    return [
      { name: '🍜 อาหารและเครื่องดื่ม', limit: 10000 },
      { name: '🛍️ ช้อปปิ้งออนไลน์', limit: 5000 },
      { name: '🚗 ค่าเดินทาง/น้ำมัน', limit: 4000 },
      { name: '📱 จ่ายบิล/ค่าเน็ต', limit: 2000 }
    ];
  });
  const [incomeCategories, setIncomeCategories] = useState(() => {
    const saved = localStorage.getItem('profitpop_inc_cats');
    return saved ? JSON.parse(saved) : ['💰 ยอดขายสินค้า', '💼 ลูกค้าโอนเงิน', '🏦 รายได้ประจำ'];
  });

  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('profitpop_txs');
    return saved ? JSON.parse(saved) : [];
  });

  const [clearedAlerts, setClearedAlerts] = useState(() => {
    const saved = localStorage.getItem('profitpop_cleared_alerts');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => { localStorage.setItem('profitpop_cleared_alerts', JSON.stringify(clearedAlerts)); }, [clearedAlerts]);
  useEffect(() => { localStorage.setItem('profitpop_exp_cats', JSON.stringify(expenseCategories)); }, [expenseCategories]);
  useEffect(() => { localStorage.setItem('profitpop_inc_cats', JSON.stringify(incomeCategories)); }, [incomeCategories]);
  useEffect(() => { localStorage.setItem('profitpop_txs', JSON.stringify(transactions)); }, [transactions]);

  // --- 🧮 2. Calculations (Real Data) ---
  const { totalIncome, totalExpense, balance, topExpenses, overBudgetAlerts } = useMemo(() => {
    let inc = 0, exp = 0;
    const expenseGroups = {};

    transactions.forEach(tx => {
      const amt = Number(tx.amount);
      if (tx.type === 'income') {
        inc += amt;
      } else {
        exp += amt;
        expenseGroups[tx.category] = (expenseGroups[tx.category] || 0) + amt;
      }
    });

    const defaultColors = [
      'bg-orange-500 shadow-orange-500/30', 
      'bg-pink-500 shadow-pink-500/30', 
      'bg-blue-500 shadow-blue-500/30', 
      'bg-slate-500 shadow-slate-500/30'
    ];

    const alerts = [];
    const topExp = Object.keys(expenseGroups)
      .map(name => {
        const catSettings = expenseCategories.find(c => (typeof c === 'object' ? c.name === name : c === name)) || { limit: 0 };
        const limit = catSettings.limit || 0;
        const amount = expenseGroups[name];
        const isOverBudget = limit > 0 && amount > limit;
        if (isOverBudget && (!clearedAlerts[name] || amount > clearedAlerts[name])) {
          alerts.push({ name, amount, limit });
        }
        return {
          name,
          amount,
          limit,
          isOverBudget,
          percent: limit > 0 ? Math.min((amount / limit) * 100, 100) : (exp > 0 ? Math.round((amount / exp) * 100) : 0),
          color: isOverBudget ? 'bg-rose-600 shadow-rose-600/50 dark:bg-rose-600' : ''
        };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);

    topExp.forEach((item, idx) => { 
      if (!item.color) item.color = defaultColors[idx % defaultColors.length]; 
    });

    return { totalIncome: inc, totalExpense: exp, balance: inc - exp, topExpenses: topExp, overBudgetAlerts: alerts };
  }, [transactions, expenseCategories, clearedAlerts]);

  const outerRadius = 40; const outerCircumference = 2 * Math.PI * outerRadius;
  const innerRadius = 25; const innerCircumference = 2 * Math.PI * innerRadius;
  
  const incomeGoal = 50000; 
  const expenseLimit = 30000;
  
  const incomePercent = Math.min((totalIncome / incomeGoal) * 100, 100) || 0;
  const expensePercent = Math.min((totalExpense / expenseLimit) * 100, 100) || 0;
  const ratioPercent = totalIncome > 0 ? Math.round((totalExpense / totalIncome) * 100) : 0;

  // --- 📄 3. Pagination & Filters ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Date Range Filter Logic
  const [filterStartDate, setFilterStartDate] = useState(todayForInput);
  const [filterEndDate, setFilterEndDate] = useState(todayForInput);

  const filteredTxs = useMemo(() => {
    return [...transactions]
      .filter(tx => tx.date >= filterStartDate && tx.date <= filterEndDate) // Filter by Range
      .filter(tx => tx.title.toLowerCase().includes(searchTerm.toLowerCase()) || tx.category.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id);
  }, [transactions, searchTerm, filterStartDate, filterEndDate]);

  const totalPages = Math.ceil(filteredTxs.length / itemsPerPage) || 1;
  const currentTxs = filteredTxs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const { filterInc, filterExp } = useMemo(() => {
    let inc = 0, exp = 0;
    filteredTxs.forEach(tx => {
      if (tx.type === 'income') inc += Number(tx.amount);
      else exp += Number(tx.amount);
    });
    return { filterInc: inc, filterExp: exp };
  }, [filteredTxs]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, itemsPerPage, filterStartDate, filterEndDate]);

  // --- 🪟 4. Modals State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('expense'); 
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [displayedAlerts, setDisplayedAlerts] = useState([]);
  
  const [customAlert, setCustomAlert] = useState(null); 
  const [customConfirm, setCustomConfirm] = useState(null); 

  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formDate, setFormDate] = useState(todayForInput);
  const [formNote, setFormNote] = useState('');
  
  const [exportStart, setExportStart] = useState(todayForInput);
  const [exportEnd, setExportEnd] = useState(todayForInput);

  const [draftExpenseCategories, setDraftExpenseCategories] = useState([]);
  const [draftIncomeCategories, setDraftIncomeCategories] = useState([]);
  const [newExpenseCat, setNewExpenseCat] = useState('');
  const [newExpenseLimit, setNewExpenseLimit] = useState('');
  const [newIncomeCat, setNewIncomeCat] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(null); 
  const COMMON_EMOJIS = ['🍜', '🛍️', '🚗', '📱', '📦', '💰', '💼', '🏦', '🏠', '🎮', '💊', '✈️', '🐶', '👶', '💄', '🛒', '🎓', '🏥'];

  const showAlert = (message, type) => {
    setCustomAlert({ message, type });
    if (type === 'success' || type === 'info') {
      setTimeout(() => setCustomAlert(null), 1000);
    }
  };

  const stripEmoji = (str) => {
    if (typeof str !== 'string') return '';
    return str.replace(/[^\u0E00-\u0E7Fa-zA-Z0-9\s()/\-.]/g, '').trim();
  };

  const handleExportCSV = () => {
    const dataToExport = transactions
      .filter(tx => tx.date >= exportStart && tx.date <= exportEnd)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (dataToExport.length === 0) {
      showAlert('ไม่มีข้อมูลในช่วงเวลาที่เลือก', 'error');
      return;
    }
    const headers = ['Date', 'Type', 'Title', 'Category', 'Amount'];
    const rows = dataToExport.map(tx => [
      tx.date,
      tx.type === 'income' ? 'รายรับ' : 'รายจ่าย',
      `"${tx.title}"`,
      `"${stripEmoji(tx.category)}"`, 
      tx.amount
    ]);
    
    // Use \uFEFF for Excel UTF-8 BOM encoding
    const csvString = headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `findash_export_${exportStart}_to_${exportEnd}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setIsExportModalOpen(false);
    showAlert('โหลดไฟล์ CSV เรียบร้อยแล้ว', 'success');
  };

  const openTransactionModal = (type) => {
    setModalType(type);
    setFormAmount('');
    setFormCategory(type === 'expense' ? (expenseCategories[0]?.name || '') : incomeCategories[0]);
    setFormDate(todayForInput);
    setFormNote('');
    setIsModalOpen(true);
  };

  const handleSaveTransaction = () => {
    if (!formAmount || isNaN(formAmount) || Number(formAmount) <= 0) {
      showAlert('กรุณากรอกจำนวนเงินให้ถูกต้อง (มากกว่า 0)', 'error');
      return;
    }

    const newTx = {
      id: Date.now(),
      type: modalType,
      amount: Number(formAmount),
      category: formCategory || (modalType === 'expense' ? (expenseCategories[0]?.name || '') : incomeCategories[0]),
      date: formDate,
      title: formNote || (modalType === 'expense' ? 'รายจ่ายทั่วไป' : 'รายรับทั่วไป')
    };

    setTransactions([...transactions, newTx]);
    setIsModalOpen(false);
    showAlert('บันทึกข้อมูลสำเร็จ', 'success');
  };

  const handleDeleteTransaction = (id) => {
    setCustomConfirm({
      message: 'คุณต้องการลบรายการของวันนี้ใช่หรือไม่? ข้อมูลจะไม่สามารถกู้คืนได้',
      onConfirm: () => {
        setTransactions(transactions.filter(t => t.id !== id));
        showAlert('ลบรายการสำเร็จ', 'info');
        setCustomConfirm(null);
      }
    });
  };

  const handleOpenSettings = () => {
    setDraftExpenseCategories([...expenseCategories]);
    setDraftIncomeCategories([...incomeCategories]);
    setIsSettingsOpen(true);
  };

  const handleSaveSettings = () => {
    setExpenseCategories([...draftExpenseCategories]);
    setIncomeCategories([...draftIncomeCategories]);
    setIsSettingsOpen(false);
    showAlert('บันทึกการตั้งค่าหมวดหมู่สำเร็จ', 'success');
  };

  const handleAddDraftCategory = (type) => {
    const val = type === 'expense' ? newExpenseCat.trim() : newIncomeCat.trim();
    if (!val) return;
    
    if (type === 'expense') {
      if (draftExpenseCategories.find(c => c.name === val)) return showAlert('หมวดหมู่นี้มีอยู่แล้ว', 'error');
      setDraftExpenseCategories([...draftExpenseCategories, { name: val, limit: Number(newExpenseLimit) || 0 }]);
      setNewExpenseCat('');
      setNewExpenseLimit('');
    } else {
      if (draftIncomeCategories.includes(val)) return showAlert('หมวดหมู่นี้มีอยู่แล้ว', 'error');
      setDraftIncomeCategories([...draftIncomeCategories, val]);
      setNewIncomeCat('');
    }
  };

  const handleRemoveDraftCategory = (type, index) => {
    setCustomConfirm({
      message: 'ลบหมวดหมู่นี้ออกจากการตั้งค่าใช่หรือไม่?',
      onConfirm: () => {
        if (type === 'expense') setDraftExpenseCategories(draftExpenseCategories.filter((_, i) => i !== index));
        else setDraftIncomeCategories(draftIncomeCategories.filter((_, i) => i !== index));
        setCustomConfirm(null);
      }
    });
  };

  const appendEmoji = (type, emoji) => {
    if (type === 'expense') {
      setNewExpenseCat(`${emoji} ${newExpenseCat}`);
      setShowEmojiPicker(null);
    } else {
      setNewIncomeCat(`${emoji} ${newIncomeCat}`);
      setShowEmojiPicker(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200 flex flex-col transition-colors duration-300">
      
      {/* 🖥️ Top Navigation Bar */}
      <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800/50 sticky top-0 z-30 shadow-sm transition-colors duration-300">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/40 transform hover:rotate-12 transition-transform duration-300">
                <TrendingUp size={22} className="text-white" strokeWidth={2.5} />
              </div>
              <span className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white">Fin-<span className="text-indigo-600 dark:text-amber-400">Dash</span></span>
            </div>
            
            {/* Nav Icons Right Side : Bell -> Profile -> Settings */}
            <div className="flex items-center space-x-3">
              <button onClick={() => toggleTheme()} className="p-2 text-slate-400 hover:text-amber-500 transition-colors bg-slate-50 dark:bg-slate-800/80 rounded-full dark:hover:text-amber-400">
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              
              <div className="relative">
                <button onClick={() => {
                  if (!isNotifOpen) {
                    if (overBudgetAlerts.length > 0) {
                      setDisplayedAlerts(overBudgetAlerts);
                      const newCleared = { ...clearedAlerts };
                      overBudgetAlerts.forEach(a => { newCleared[a.name] = a.amount; });
                      setClearedAlerts(newCleared);
                    }
                  } else {
                    setDisplayedAlerts([]);
                  }
                  setIsNotifOpen(!isNotifOpen);
                }} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors bg-slate-50 dark:bg-slate-800/80 rounded-full dark:hover:text-indigo-400 relative">
                  <Bell size={20} />
                  {overBudgetAlerts.length > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-rose-500 border-2 border-white dark:border-slate-900 rounded-full animate-bounce"></span>}
                </button>
                {isNotifOpen && (
                  <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-4">
                    <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-200">การแจ้งเตือน</span>
                      <button onClick={() => { setIsNotifOpen(false); setDisplayedAlerts([]); }} className="text-slate-400 hover:text-rose-500 bg-slate-200/50 dark:bg-slate-800 rounded-full p-1"><X size={14}/></button>
                    </div>
                    <div className="max-h-64 overflow-y-auto custom-scrollbar p-2">
                      {displayedAlerts.length > 0 ? displayedAlerts.map((alert, idx) => (
                        <div key={idx} className="flex gap-3 items-start p-3 bg-rose-50 dark:bg-rose-500/10 rounded-xl mb-2 last:mb-0 border border-rose-100 dark:border-rose-500/20">
                          <div className="bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 p-1.5 rounded-lg mt-0.5">
                            <AlertCircle size={16} strokeWidth={3}/>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-rose-700 dark:text-rose-300 leading-snug">⚠️ หมวดหมู่ {alert.name} เกินงบที่ตั้งไว้!</p>
                            <p className="text-xs text-rose-600 dark:text-rose-400/80 mt-1 font-medium">ใช้ไป ฿{alert.amount.toLocaleString()} / งบ ฿{alert.limit.toLocaleString()}</p>
                          </div>
                        </div>
                      )) : (
                        <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-sm font-medium">
                          ไม่มีการแจ้งเตือน
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center font-bold text-sm shadow-md cursor-pointer hover:scale-105 transition-transform border-2 border-white dark:border-slate-800 ml-1">
                ME
              </div>
              <button onClick={handleOpenSettings} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors bg-slate-50 dark:bg-slate-800/80 rounded-full dark:hover:text-indigo-400">
                <Settings size={20} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* 📦 Main Content Container */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-grow flex flex-col">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="text-slate-800 dark:text-white text-2xl font-black bg-indigo-50 dark:bg-indigo-500/10 inline-flex items-center px-4 py-2.5 rounded-2xl border border-indigo-100 dark:border-indigo-500/20 shadow-sm transition-colors">
              🗓️ สรุปยอดบัญชี
            </div>
            <button 
              onClick={() => setIsExportModalOpen(true)} 
              className="flex items-center gap-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-4 py-2.5 rounded-2xl font-bold transition-all text-sm shadow-sm"
            >
              <Download size={18}/>
              <span className="hidden sm:inline">Export Excel</span>
            </button>
          </div>
          
          <div className="flex space-x-3 w-full md:w-auto">
            <button onClick={() => openTransactionModal('expense')} className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-rose-600 hover:bg-rose-700 text-white px-5 py-3 rounded-2xl font-bold transition-all shadow-md shadow-rose-600/20 active:scale-95 text-base">
              <Minus size={18} strokeWidth={3} />
              <span>จดรายจ่าย</span>
            </button>
            <button onClick={() => openTransactionModal('income')} className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-2xl font-bold transition-all shadow-md shadow-emerald-600/20 active:scale-95 text-base">
              <Plus size={18} strokeWidth={3} />
              <span>รับเงินเข้า</span>
            </button>
          </div>
        </div>

        {/* 💳 Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-indigo-900 via-[#312e81] to-purple-900 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden border border-indigo-700/50 dark:border-slate-700/50">
            <div className="absolute top-0 right-0 -mr-10 -mt-10 w-48 h-48 rounded-full bg-indigo-400/20 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 rounded-full bg-purple-500/20 blur-3xl"></div>
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-2">
                  <Wallet size={20} className="text-indigo-300 dark:text-indigo-400" />
                  <h3 className="text-indigo-200 dark:text-indigo-300 font-semibold text-sm tracking-widest uppercase text-shadow-sm">ยอดเงินคงเหลือ / Balance</h3>
                </div>
                {/* Fake EMV Chip */}
                <div className="w-11 h-7 bg-gradient-to-br from-yellow-300 to-amber-500 rounded flex items-center justify-center opacity-90 shadow-sm border border-yellow-600/50">
                  <div className="w-7 h-4 border border-yellow-700/30 rounded-sm"></div>
                </div>
              </div>
              <div>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter drop-shadow-lg mb-2 truncate">฿{balance.toLocaleString()}</h2>
                <div className="text-indigo-200/80 dark:text-indigo-300/60 text-sm tracking-[0.2em] font-medium flex gap-5 mt-4">
                  <span>****</span><span>****</span><span>****</span><span>5678</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800/60 shadow-sm flex flex-col justify-center relative transition-colors duration-300">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-slate-500 dark:text-slate-400 font-bold text-sm tracking-wide">รับแล้วเดือนนี้</h3>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400"><ArrowUpRight size={20} strokeWidth={3} /></div>
            </div>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-emerald-600 dark:text-emerald-400 mt-2 truncate">+{totalIncome.toLocaleString()}</h2>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-5 overflow-hidden"><div className="bg-emerald-500 dark:bg-emerald-400 h-full rounded-full" style={{ width: `${incomePercent}%` }}></div></div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800/60 shadow-sm flex flex-col justify-center relative transition-colors duration-300">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-slate-500 dark:text-slate-400 font-bold text-sm tracking-wide">จ่ายแล้วเดือนนี้</h3>
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400"><ArrowDownRight size={20} strokeWidth={3} /></div>
            </div>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-rose-600 dark:text-rose-400 mt-2 truncate">-{totalExpense.toLocaleString()}</h2>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-5 overflow-hidden"><div className="bg-rose-500 dark:bg-rose-400 h-full rounded-full" style={{ width: `${expensePercent}%` }}></div></div>
          </div>
        </div>

        {/* 📊 Main Layout (Grid 1/4 and 3/4) */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-grow">
          
          {/* ซ้าย (กราฟ + สัดส่วน) */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800/60 shadow-sm transition-colors duration-300">
              <h3 className="text-lg font-black text-slate-800 dark:text-white mb-6">สัดส่วนการเงิน</h3>
              <div className="flex justify-center mb-2">
                <div className="w-56 h-56 relative animate-in zoom-in duration-500 ease-out">
                  <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90 drop-shadow-sm">
                    {/* Track Background based on theme */}
                    <circle cx="50" cy="50" r={outerRadius} fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" className="text-emerald-50 dark:text-emerald-950" />
                    <circle cx="50" cy="50" r={outerRadius} fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeDasharray={outerCircumference} strokeDashoffset={outerCircumference - (incomePercent / 100) * outerCircumference} className="text-emerald-500 dark:text-emerald-400 transition-all duration-1000 ease-out" />
                    <circle cx="50" cy="50" r={innerRadius} fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" className="text-rose-50 dark:text-rose-950" />
                    <circle cx="50" cy="50" r={innerRadius} fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeDasharray={innerCircumference} strokeDashoffset={innerCircumference - (expensePercent / 100) * innerCircumference} className="text-rose-500 dark:text-rose-400 transition-all duration-1000 ease-out" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col transform rotate-0">
                    <span className="text-sm font-bold text-slate-500 dark:text-slate-400">ใช้ไปแล้ว</span>
                    <span className="text-4xl font-black text-rose-600 dark:text-rose-400">{ratioPercent}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800/60 shadow-sm transition-colors duration-300">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-slate-800 dark:text-white">จ่ายหนักสุด 💸</h3>
              </div>
              <div className="space-y-6">
                {topExpenses.length > 0 ? topExpenses.map((cat, idx) => (
                  <div key={idx} className="group relative">
                    <div className="flex justify-between font-bold mb-2 items-end">
                      <div className="flex flex-col">
                        {cat.isOverBudget && (
                          <div className="mb-1.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 px-1.5 py-0.5 rounded-md tracking-wide">
                              <AlertCircle size={12}/> เกินงบ
                            </span>
                          </div>
                        )}
                        <span className="truncate pr-2 text-base text-slate-800 dark:text-slate-200 leading-tight">
                          {cat.name}
                        </span>
                      </div>
                      <span className="flex flex-col items-end text-right justify-end">
                        {cat.limit > 0 && <span className="text-xs text-slate-400 font-medium tracking-wide whitespace-nowrap mb-0.5">งบ ฿{cat.limit.toLocaleString()}</span>}
                        <span className={`${cat.isOverBudget ? 'text-rose-600 dark:text-rose-400 text-2xl font-black leading-none' : 'text-slate-800 dark:text-slate-200 text-xl leading-none'}`}>
                          ฿{cat.amount.toLocaleString()}
                        </span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden mt-2">
                       <div className={`${cat.color} h-full rounded-full transition-all duration-500`} style={{ width: `${cat.percent}%` }}></div>
                    </div>
                  </div>
                )) : (
                  <p className="text-base text-slate-400 dark:text-slate-500 text-center py-4 font-medium">ยังไม่มีข้อมูลรายจ่าย</p>
                )}
              </div>
            </div>
          </div>

          {/* ขวา (ตาราง) */}
          <div className="lg:col-span-3 flex flex-col h-full">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800/60 shadow-sm flex-grow flex flex-col transition-colors duration-300">
              
              <div className="flex flex-col xl:flex-row xl:justify-between xl:items-end mb-6 gap-6 border-b border-slate-100 dark:border-slate-800/60 pb-5">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">รายการเดินบัญชี</h3>
                  {/* Date Range Filter Panel with Summary */}
                  <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3 mt-4 bg-slate-50/50 dark:bg-slate-900/20 p-2 rounded-2xl border border-slate-100 dark:border-slate-800/60 w-full lg:w-fit">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 shrink-0 w-full lg:w-auto">
                      <div className="flex items-center justify-between sm:justify-start gap-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/60 rounded-xl px-3 py-1.5 shadow-sm w-full sm:w-auto">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">เริ่ม:</span>
                        <input 
                          type="date" 
                          value={filterStartDate} 
                          onChange={(e) => setFilterStartDate(e.target.value)}
                          className="bg-transparent text-sm font-bold text-indigo-700 dark:text-indigo-400 focus:outline-none w-[115px]"
                        />
                      </div>
                      <span className="text-slate-300 dark:text-slate-600 font-black hidden sm:block">-</span>
                      <div className="flex items-center justify-between sm:justify-start gap-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/60 rounded-xl px-3 py-1.5 shadow-sm w-full sm:w-auto">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">ถึง:</span>
                        <input 
                          type="date" 
                          value={filterEndDate} 
                          onChange={(e) => setFilterEndDate(e.target.value)}
                          className="bg-transparent text-sm font-bold text-indigo-700 dark:text-indigo-400 focus:outline-none w-[115px]"
                        />
                      </div>
                      <button 
                        onClick={() => { setFilterStartDate(todayForInput); setFilterEndDate(todayForInput); }}
                        className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-xl text-xs font-bold transition-all w-full sm:w-auto"
                      >
                        Clear
                      </button>
                    </div>

                    <div className="hidden lg:block w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                    
                    <div className="flex justify-between w-full lg:w-auto gap-4 text-xs sm:text-sm font-bold bg-white dark:bg-slate-950 px-4 py-1.5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/60 shrink-0 mx-auto lg:mx-0">
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                         <ArrowUpRight size={14} strokeWidth={3}/> รับ: ฿{filterInc.toLocaleString()}
                      </span>
                      <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1 border-l border-slate-100 dark:border-slate-800 pl-4">
                         <ArrowDownRight size={14} strokeWidth={3}/> จ่าย: ฿{filterExp.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-start xl:items-end gap-3 w-full xl:w-auto mt-4 xl:mt-0">

                  <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 bg-slate-50/50 dark:bg-slate-900/20 p-2 rounded-2xl border border-slate-100 dark:border-slate-800/60 w-full xl:w-auto mt-2 justify-start xl:justify-end">
                    <select 
                      value={itemsPerPage} 
                      onChange={(e) => setItemsPerPage(Number(e.target.value))}
                      className="w-full sm:w-auto bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl px-3 py-1.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                    >
                      <option value={5}>5 รายการ</option>
                      <option value={10}>10 รายการ</option>
                      <option value={20}>20 รายการ</option>
                      <option value={50}>50 รายการ</option>
                    </select>

                    <div className="relative w-full sm:w-auto sm:flex-grow-0">
                      <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="ค้นหารายการ..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-4 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/60 rounded-xl text-sm text-slate-800 dark:text-slate-200 font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-48 xl:w-56 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3 flex-grow overflow-y-auto custom-scrollbar max-h-[550px] pr-2">
                {currentTxs.length > 0 ? currentTxs.map((tx) => {
                  const isInc = tx.type === 'income';
                  return (
                    <div key={tx.id} className="group bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow-md gap-2">
                      <div className="flex items-center space-x-3 sm:space-x-4 overflow-hidden flex-1 min-w-0">
                        <div className={`w-12 h-12 flex-shrink-0 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center ${isInc ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20'}`}>
                          {isInc ? <ArrowUpRight size={22} className="sm:w-6 sm:h-6" strokeWidth={2.5} /> : <ArrowDownRight size={22} className="sm:w-6 sm:h-6" strokeWidth={2.5} />}
                        </div>
                        <div className="flex flex-col min-w-0 justify-center">
                          <div className="mb-1 sm:mb-1.5 flex items-center gap-2">
                            <span className="text-[10px] sm:text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-100 dark:border-indigo-500/20 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md truncate max-w-[120px] sm:max-w-full">{tx.category}</span>
                            {/* Keep mini date indicator just in case for range search */}
                            {filterStartDate !== filterEndDate && <span className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 px-1 truncate flex-shrink-0">{tx.date.split('-').reverse().join('-')}</span>}
                          </div>
                          <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-lg md:text-xl truncate text-wrap leading-tight max-h-[40px] overflow-hidden">{tx.title}</h4>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 sm:space-x-4 flex-shrink-0 ml-1 sm:ml-3">
                        <div className={`font-black text-base sm:text-xl md:text-2xl text-right tracking-tight ${isInc ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {isInc ? '+' : '-'}฿{tx.amount.toLocaleString()}
                        </div>
                        <button onClick={() => handleDeleteTransaction(tx.id)} className="text-slate-300 dark:text-slate-600 hover:text-rose-600 dark:hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 sm:p-2">
                          <Trash2 size={16} className="sm:w-5 sm:h-5"/>
                        </button>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="text-center py-16 text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center h-full">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-300 dark:text-slate-600">
                      <Search size={32} />
                    </div>
                    <p className="text-lg font-bold text-slate-500 dark:text-slate-400">ไม่มีรายการเดินบัญชี</p>
                    <p className="text-sm mt-2 font-medium">ค้นหาจากช่วงเวลาอื่น หรือเพิ่มรายการใหม่</p>
                  </div>
                )}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/60">
                  <span className="text-sm text-slate-500 dark:text-slate-400 font-bold">
                    หน้า {currentPage} จาก {totalPages}
                  </span>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
                    >
                      <ChevronLeft size={20}/>
                    </button>
                    <button 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
                    >
                      <ChevronRight size={20}/>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 🚀 Modal Export CSV */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-sm max-h-[90vh] flex flex-col overflow-hidden relative animate-in zoom-in-95 border border-slate-100 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950 shrink-0">
              <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Download size={20} className="text-indigo-600 dark:text-indigo-400" /> Export ข้อมูล Excel
              </h2>
              <button onClick={() => setIsExportModalOpen(false)} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full p-2 transition-colors">
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">วันเริ่มต้น</label>
                <input type="date" value={exportStart} onChange={(e)=>setExportStart(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-base rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">วันสิ้นสุด</label>
                <input type="date" value={exportEnd} onChange={(e)=>setExportEnd(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-base rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
              </div>
              <button 
                onClick={handleExportCSV}
                className="w-full py-4 rounded-xl font-black text-white text-lg shadow-lg shadow-indigo-500/30 transition-all active:scale-95 mt-4 bg-indigo-600 hover:bg-indigo-700"
              >
                ดาวน์โหลดไฟล์ .csv
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 Modal บันทึกบัญชี (Transaction Form) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden relative animate-in zoom-in-95 border border-slate-100 dark:border-slate-800/80">
            <div className={`p-8 text-white text-center relative shrink-0 ${modalType === 'income' ? 'bg-emerald-600 dark:bg-emerald-700' : 'bg-rose-600 dark:bg-rose-700'}`}>
              <button onClick={() => setIsModalOpen(false)} className="absolute top-5 right-5 bg-black/10 hover:bg-black/20 rounded-full p-2.5 transition-colors z-50">
                <X size={20} strokeWidth={3} />
              </button>
              <h2 className="text-3xl font-black mb-6 drop-shadow-md tracking-tight">
                {modalType === 'income' ? 'บันทึกรายรับ' : 'จดรายจ่าย'}
              </h2>
              <div>
                <p className="text-white/80 dark:text-white/60 text-sm font-semibold mb-2">จำนวนเงิน (บาท)</p>
                <input 
                  type="number" placeholder="0.00" min="0" autoFocus
                  value={formAmount} onChange={(e) => setFormAmount(e.target.value)}
                  onKeyDown={(e) => { if (['-', '+', 'e'].includes(e.key)) e.preventDefault(); }}
                  className="no-spinners w-full bg-transparent text-center text-6xl font-black text-white placeholder-white/50 focus:outline-none"
                />
                <div className="w-32 h-1 bg-white/30 dark:bg-white/20 rounded-full mx-auto mt-3"></div>
              </div>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">หมวดหมู่</label>
                <div className="relative">
                  <select value={formCategory} onChange={(e)=>setFormCategory(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-base rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold appearance-none">
                    {modalType === 'expense' 
                      ? expenseCategories.map((cat, idx) => <option key={idx} value={cat.name}>{cat.name}</option>)
                      : incomeCategories.map((cat, idx) => <option key={idx} value={cat}>{cat}</option>)
                    }
                  </select>
                  <ChevronRight size={18} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">วันที่ทำรายการ</label>
                <input type="date" value={formDate} onChange={(e)=>setFormDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-base rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">บันทึกช่วยจำ (Note)</label>
                <input type="text" value={formNote} onChange={(e)=>setFormNote(e.target.value)} placeholder="รายละเอียดเพิ่มเติม..." className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-base rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium" />
              </div>
              <button 
                onClick={handleSaveTransaction}
                className={`w-full py-4 rounded-xl font-black text-white text-lg shadow-lg transition-all active:scale-95 mt-4 ${
                  modalType === 'income' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/30'
                }`}
              >
                บันทึกข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⚙️ Modal ตั้งค่าระบบ (Settings) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 border border-slate-100 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center space-x-3">
                <div className="bg-indigo-100 dark:bg-indigo-500/20 p-2.5 rounded-xl text-indigo-600 dark:text-indigo-400"><Settings size={22} /></div>
                <h2 className="text-2xl font-black text-slate-800 dark:text-white">ตั้งค่าหมวดหมู่</h2>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full p-2 transition-colors">
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-white dark:bg-slate-900 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-base font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2 mb-4"><Plus size={18}/> หมวดหมู่รายรับ</h3>
                  <div className="relative mb-4">
                    <div className="flex space-x-2">
                      <div className="relative flex-1">
                        <input type="text" value={newIncomeCat} onChange={(e) => setNewIncomeCat(e.target.value)} placeholder="เพิ่มหมวดหมู่..." className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl pl-3 pr-10 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
                        <button onClick={() => setShowEmojiPicker(showEmojiPicker === 'income' ? null : 'income')} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 p-1"><Smile size={18} /></button>
                      </div>
                      <button onClick={() => handleAddDraftCategory('income')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm">เพิ่ม</button>
                    </div>
                    {showEmojiPicker === 'income' && (
                      <div className="absolute z-10 top-full left-0 mt-2 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl p-3 flex flex-wrap gap-1">
                        {COMMON_EMOJIS.map(e => <button key={e} onClick={() => appendEmoji('income', e)} className="hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg p-2 text-xl">{e}</button>)}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
                    {draftIncomeCategories.map((cat, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60 p-3 rounded-xl group hover:border-emerald-200 dark:hover:border-emerald-500/30">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{cat}</span>
                        <button onClick={() => handleRemoveDraftCategory('income', idx)} className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"><Trash2 size={16}/></button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2 mb-4"><Minus size={18}/> หมวดหมู่รายจ่าย</h3>
                  <div className="relative mb-4">
                    <div className="flex flex-col space-y-2">
                      <div className="relative flex-1">
                        <input type="text" value={newExpenseCat} onChange={(e) => setNewExpenseCat(e.target.value)} placeholder="เพิ่มหมวดหมู่..." className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl pl-3 pr-10 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"/>
                        <button onClick={() => setShowEmojiPicker(showEmojiPicker === 'expense' ? null : 'expense')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1"><Smile size={18} /></button>
                      </div>
                      <div className="flex space-x-2">
                        <input type="number" placeholder="งบ (สูงสุด/เดือน)" value={newExpenseLimit} onChange={(e) => setNewExpenseLimit(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"/>
                        <button onClick={() => handleAddDraftCategory('expense')} className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm whitespace-nowrap">เพิ่ม</button>
                      </div>
                    </div>
                    {showEmojiPicker === 'expense' && (
                      <div className="absolute z-10 top-full left-0 mt-2 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl p-3 flex flex-wrap gap-1">
                        {COMMON_EMOJIS.map(e => <button key={e} onClick={() => appendEmoji('expense', e)} className="hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg p-2 text-xl">{e}</button>)}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
                    {draftExpenseCategories.map((cat, idx) => (
                      <div key={idx} className="flex flex-col bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60 p-3 rounded-xl group hover:border-rose-200 dark:hover:border-rose-500/30 gap-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{cat.name}</span>
                          <button onClick={() => handleRemoveDraftCategory('expense', idx)} className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"><Trash2 size={16}/></button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">งบ:</span>
                          <input 
                            type="number" 
                            min="0"
                            value={cat.limit || ''} 
                            onChange={(e) => {
                              const updated = [...draftExpenseCategories];
                              updated[idx].limit = Number(e.target.value);
                              setDraftExpenseCategories(updated);
                            }}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 w-24 text-xs font-bold text-rose-600 dark:text-rose-400 px-2 py-1 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-500"
                            placeholder="ไม่จำกัด"
                          />
                          <span className="text-xs text-slate-400 pb-0.5">บาท</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end">
              <button onClick={handleSaveSettings} className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md active:scale-95 text-base">
                <Save size={18} strokeWidth={2.5}/><span>บันทึกการตั้งค่า</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🟢 Custom Alert Modal / Toast */}
      {customAlert && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xs p-6 text-center animate-in zoom-in-95 border border-slate-100 dark:border-slate-800">
            <div className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4 ${
              customAlert.type === 'error' ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400' : 
              customAlert.type === 'success' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : 
              'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400'
            }`}>
              {customAlert.type === 'error' ? <AlertCircle size={28}/> : <Info size={28}/>}
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">
              {customAlert.type === 'success' ? 'สำเร็จ!' : 'แจ้งเตือน'}
            </h3>
            <p className={`text-base font-medium text-slate-600 dark:text-slate-400 ${customAlert.type === 'error' ? 'mb-6' : ''}`}>
              {customAlert.message}
            </p>
            {customAlert.type === 'error' && (
              <button 
                onClick={() => setCustomAlert(null)}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold rounded-xl transition-colors text-base"
              >
                ตกลง
              </button>
            )}
          </div>
        </div>
      )}

      {/* 🔴 Custom Confirm Modal */}
      {customConfirm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center animate-in zoom-in-95 border border-slate-100 dark:border-slate-800">
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-5 bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
              <AlertCircle size={32} strokeWidth={2.5}/>
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-3">ยืนยันการทำรายการ</h3>
            <p className="text-base text-slate-600 dark:text-slate-400 mb-8 font-medium">{customConfirm.message}</p>
            <div className="flex space-x-3">
              <button onClick={() => setCustomConfirm(null)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors text-base">
                ยกเลิก
              </button>
              <button onClick={customConfirm.onConfirm} className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md shadow-rose-600/20 transition-colors text-base">
                ยืนยัน
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
