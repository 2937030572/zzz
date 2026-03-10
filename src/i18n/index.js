import { createI18n } from 'vue-i18n'

const messages = {
  en: {
    nav: {
      login: 'Login',
      dashboard: 'Dashboard',
      daily: 'Daily',
      calendar: 'Calendar',
      screenshots: 'Screenshots',
      videos: 'Videos',
      diary: 'Diary',
      notes: 'Notes',
      playbook: 'Playbook',
      addPlaybook: 'Add Playbook',
      addTrades: 'Add Trades',
      addEntry: 'Add Entry',
      addDiary: 'Add Diary',
      settings: 'Settings',
      addScreenshot: 'Add Screenshot',
      addExcursions: 'Add Excursions',
      entries: 'Entries',
      forecast: 'Forecast',
      imports: 'Imports',
      checkout: 'Checkout',
      checkoutSuccess: 'Checkout Success'
    },
    dropdown: {
      add: 'Add',
      trades: 'Trades',
      diaryEntry: 'Diary Entry',
      screenshot: 'Screenshot',
      playbook: 'Playbook',
      excursions: 'Excursions',
      settings: 'Settings',
      imports: 'Imports',
      tutorial: 'Tutorial',
      logout: 'Logout'
    },
    login: {
      title: 'Login',
      email: 'Email',
      password: 'Password',
      submit: 'Login',
      register: 'Register',
      forgotPassword: 'Forgot Password?'
    },
    register: {
      title: 'Register',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      submit: 'Register',
      login: 'Login'
    },
    settings: {
      title: 'Settings',
      profile: 'Profile',
      account: 'Account',
      notifications: 'Notifications',
      language: 'Language',
      save: 'Save'
    },
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      add: 'Add',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      search: 'Search',
      filter: 'Filter',
      clear: 'Clear',
      export: 'Export',
      import: 'Import',
      yes: 'Yes',
      no: 'No',
      loading: 'Loading...',
      success: 'Success!',
      error: 'Error!',
      warning: 'Warning!',
      info: 'Info'
    }
  },
  zh: {
    nav: {
      login: '登录',
      dashboard: '仪表盘',
      daily: '每日',
      calendar: '日历',
      screenshots: '截图',
      videos: '视频',
      diary: '日记',
      notes: '笔记',
      playbook: '策略本',
      addPlaybook: '添加策略',
      addTrades: '添加交易',
      addEntry: '添加入场',
      addDiary: '添加日记',
      settings: '设置',
      addScreenshot: '添加截图',
      addExcursions: '添加偏移',
      entries: '入场',
      forecast: '预测',
      imports: '导入',
      checkout: '结账',
      checkoutSuccess: '结账成功'
    },
    dropdown: {
      add: '添加',
      trades: '交易',
      diaryEntry: '日记条目',
      screenshot: '截图',
      playbook: '策略',
      excursions: '偏移',
      settings: '设置',
      imports: '导入',
      tutorial: '教程',
      logout: '退出登录'
    },
    login: {
      title: '登录',
      email: '邮箱',
      password: '密码',
      submit: '登录',
      register: '注册',
      forgotPassword: '忘记密码?'
    },
    register: {
      title: '注册',
      email: '邮箱',
      password: '密码',
      confirmPassword: '确认密码',
      submit: '注册',
      login: '登录'
    },
    settings: {
      title: '设置',
      profile: '个人资料',
      account: '账户',
      notifications: '通知',
      language: '语言',
      save: '保存'
    },
    common: {
      save: '保存',
      cancel: '取消',
      delete: '删除',
      edit: '编辑',
      add: '添加',
      back: '返回',
      next: '下一步',
      previous: '上一步',
      search: '搜索',
      filter: '筛选',
      clear: '清除',
      export: '导出',
      import: '导入',
      yes: '是',
      no: '否',
      loading: '加载中...',
      success: '成功!',
      error: '错误!',
      warning: '警告!',
      info: '信息'
    }
  }
}

const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem('lang') || 'en',
  fallbackLocale: 'en',
  messages
})

export default i18n