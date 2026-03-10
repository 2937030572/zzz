<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale, setLocale } = useI18n()

const languages = [
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文' }
]

const currentLanguage = computed(() => {
  return languages.find(lang => lang.value === locale.value)
})

const switchLanguage = async (lang) => {
  await setLocale(lang)
  localStorage.setItem('lang', lang)
  // 刷新页面以更新所有组件
  window.location.reload()
}
</script>

<template>
  <div class="language-switcher">
    <div class="dropdown">
      <button class="btn btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
        {{ currentLanguage.label }}
      </button>
      <ul class="dropdown-menu dropdown-menu-end">
        <li v-for="lang in languages" :key="lang.value">
          <a class="dropdown-item" @click="switchLanguage(lang.value)">
            {{ lang.label }}
          </a>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.language-switcher {
  margin-right: 10px;
}
</style>