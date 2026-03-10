<script setup>
import { onMounted, ref } from 'vue';
import { useCheckCloudPayment, useGetCurrentUser, useToggleMobileMenu, useInitializeDefaultUser } from '../utils/utils.js'
import { useInitShepherd, useInitTooltip } from "../utils/utils.js";
import { pageId, currentUser, renderProfile, screenType, latestVersion } from "../stores/globals"
import { version } from '../../package.json';
import { useI18n } from 'vue-i18n';
import LanguageSwitcher from './LanguageSwitcher.vue';

/* MODULES */
import axios from 'axios'

const { t, locale } = useI18n();

// 用户列表
const users = ref([]);
// 当前选中的用户
const selectedUser = ref('');

// 初始化用户列表
const initUsers = () => {
    // 从本地存储获取所有用户
    const savedUsers = localStorage.getItem('users')
    if (savedUsers) {
        users.value = JSON.parse(savedUsers)
    } else {
        // 创建默认用户
        const defaultUser = {
            id: 'default-user',
            name: 'Default User'
        }
        users.value = [defaultUser]
        localStorage.setItem('users', JSON.stringify(users.value))
    }
    // 设置当前选中的用户
    const currentUserId = currentUser.value ? currentUser.value.objectId : 'default-user'
    selectedUser.value = currentUserId
};

// 切换用户
const switchUser = (userId) => {
    // 从本地存储获取用户数据
    const savedUserData = localStorage.getItem(`user_${userId}`)
    if (savedUserData) {
        currentUser.value = JSON.parse(savedUserData)
        localStorage.setItem('currentUser', JSON.stringify(currentUser.value))
        selectedUser.value = userId
        // 刷新页面
        window.location.reload()
    }
};

// 添加新用户
const addNewUser = () => {
    const userName = prompt('请输入新用户名称:')
    if (userName) {
        const newUserId = `user_${Date.now()}`
        // 创建新用户
        const newUser = {
            objectId: newUserId,
            username: userName,
            email: `${userName}@example.com`,
            timeZone: 'America/New_York',
            accounts: [
                { value: 'all', label: 'All Accounts' }
            ],
            apis: [],
            tags: [],
            legacy: []
        }
        // 保存到本地存储
        localStorage.setItem(`user_${newUserId}`, JSON.stringify(newUser))
        // 更新用户列表
        users.value.push({ id: newUserId, name: userName })
        localStorage.setItem('users', JSON.stringify(users.value))
        // 切换到新用户
        switchUser(newUserId)
    }
};

// 响应式的页面列表
const pages = computed(() => [{
    id: "dashboard",
    name: t('nav.dashboard'),
    icon: "uil uil-apps"
},
{
    id: "daily",
    name: t('nav.daily'),
    icon: "uil uil-signal-alt-3"
},
{
    id: "calendar",
    name: t('nav.calendar'),
    icon: "uil uil-calendar-alt"
},
{
    id: "screenshots",
    name: t('nav.screenshots'),
    icon: "uil uil-image-v"
},
{
    id: "videos",
    name: "Videos",
    icon: "uil uil-clapper-board"
},
{
    id: "diary",
    name: t('nav.diary'),
    icon: "uil uil-diary"
},
{
    id: "notes",
    name: t('nav.notes'),
    icon: "uil uil-diary"
},
{
    id: "playbook",
    name: t('nav.playbook'),
    icon: "uil uil-compass"
},
{
    id: "addPlaybook",
    name: t('nav.addPlaybook'),
    icon: "uil uil-compass"
},
{
    id: "addTrades",
    name: t('nav.addTrades'),
    icon: "uil uil-plus-circle"
},
{
    id: "addEntry",
    name: t('nav.addEntry'),
    icon: "uil uil-signin"
},
{
    id: "addDiary",
    name: t('nav.addDiary'),
    icon: "uil uil-plus-circle"
},
{
    id: "settings",
    name: t('nav.settings'),
    icon: "uil uil-sliders-v-alt"
},
{
    id: "addScreenshot",
    name: t('nav.addScreenshot'),
    icon: "uil uil-image-v"
},
{
    id: "addExcursions",
    name: t('nav.addExcursions'),
    icon: "uil uil-refresh"
},
{
    id: "entries",
    name: t('nav.entries'),
    icon: "uil uil-signin"
},
{
    id: "forecast",
    name: t('nav.forecast'),
    icon: "uil uil-cloud-sun"
},
{
    id: "imports",
    name: t('nav.imports'),
    icon: "uil uil-import"
}
])

onMounted(async () => {
    await getLatestVersion()
    await useInitTooltip()
    initUsers()
})

function getLatestVersion() {
    return new Promise(async (resolve, reject) => {
        await axios.get("/api/dockerVersion")
    .then((response) => {
        //console.log(" -> data " + JSON.stringify(response.data));
        for (const element of response.data.results) { // Use for...of for iteration
            console.log("name " + element.name);
            if (element.name !== "latest") {
                latestVersion.value.docker = element.name;
                break; // Stop iterating after the first match
            }
        }
    })
    .catch((error) => {
        console.error("Error: ", error);
    })
    .finally(function () {
        // Always executed
    });
        
        await axios.get("https://raw.githubusercontent.com/Eleven-Trading/TradeNote/main/package.json")
            .then((response) => {
                //console.log(" -> data " + JSON.stringify(response.data))
                latestVersion.value.gitHub = response.data.version
                
            })
            .catch((error) => {
            })
            .finally(function () {
                // always executed
            })

            console.log(" -> Latest versions " + JSON.stringify(latestVersion.value))
        resolve()
    })
}

const navAdd = async (param) => {
    await useGetCurrentUser();
    try {
        // 跳过云支付检查，因为我们不再使用登录功能
        // await useCheckCloudPayment(currentUser.value);
        // Redirect only if no error occurs
        window.location.href = "/" + param;
    } catch (error) {
        //console.log("-> useCheckCloudPayment error: " + error);
        // 跳过结账页面重定向
        window.location.href = "/" + param;
    }
};


</script>

<template>
    <div class="justify-content-between navbar">
        <div class="col-6">
            <span v-if="screenType == 'mobile'">
                <a v-on:click="useToggleMobileMenu">
                    <i v-bind:class="pages.filter(item => item.id == pageId)[0].icon" class="me-1"></i>{{
                        pages.filter(item => item.id == pageId)[0].name }}</a>
            </span>
            <span v-else>
                <i v-bind:class="pages.filter(item => item.id == pageId)[0].icon" class="me-1"></i>{{
                    pages.filter(item => item.id == pageId)[0].name }}</span>
        </div>
        <div class="col-6 ms-auto text-end">
            <div class="row">
                <div class="col align-self-end">
                    <LanguageSwitcher />
                </div>
                <!-- 用户切换下拉菜单 -->
                <div class="col align-self-end">
                    <div class="dropdown">
                        <button class="btn btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                            {{ users.find(user => user.id === selectedUser)?.name || 'User' }}
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end">
                            <li v-for="user in users" :key="user.id">
                                <a class="dropdown-item" @click="switchUser(user.id)">
                                    {{ user.name }}
                                </a>
                            </li>
                            <li>
                                <hr class="dropdown-divider">
                            </li>
                            <li>
                                <a class="dropdown-item" @click="addNewUser()">
                                    <i class="uil uil-plus me-2"></i>Add New User
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
                <div id="step11" class="col align-self-end">
                    <button class="btn blueBtn btn-sm" href="#" id="navbarDropdown" type="button"
                        data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="uil uil-plus me-2"></i>{{ t('dropdown.add') }}</button>
                    <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="navbarDropdown">
                        <li>
                            <a class="dropdown-item" @click="navAdd('addTrades')">{{ t('dropdown.trades') }}</a>
                        </li>
                        <li>
                            <a class="dropdown-item" @click="navAdd('addDiary')">{{ t('dropdown.diaryEntry') }}</a>
                        </li>
                        <li>
                            <a class="dropdown-item" @click="navAdd('addScreenshot')">{{ t('dropdown.screenshot') }}</a>
                        </li>
                        <li>
                            <a class="dropdown-item" @click="navAdd('addPlaybook')">{{ t('dropdown.playbook') }}</a>
                        </li>
                        <li>
                            <a class="dropdown-item" @click="navAdd('addExcursions')">{{ t('dropdown.excursions') }}</a>
                        </li>

                    </ul>
                </div>
                <div id="step12" class="col-1 me-3" v-bind:key="renderProfile">
                    <a id="navbarDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                        <span><img class="profileImg" src="../assets/astronaut.png" /></span>
                    </a>
                    <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="navbarDropdown">

                        <li>
                            <a class="dropdown-item" href="settings">
                                <i class="uil uil-sliders-v-alt me-2"></i>{{ t('dropdown.settings') }}</a>
                        </li>

                        <li>
                            <a class="dropdown-item" href="imports">
                                <i class="uil uil-import me-2"></i>{{ t('dropdown.imports') }}</a>
                        </li>

                        <li>
                            <a class="dropdown-item" v-on:click="useInitShepherd()">
                                <i class="uil uil-question-circle me-2"></i>{{ t('dropdown.tutorial') }}</a>
                        </li>
                        <li>
                            <hr class="dropdown-divider">
                        </li>
                        <li class="text-center">
                            <span class="txt-small">v{{ version }}
                                <!--<i v-if="latestVersion != version"
                                    class="ps-1 uil uil-info-circle" data-bs-toggle="tooltip" data-bs-html="true"
                                    v-bind:data-bs-title="'New version available<br>v' + latestVersion"></i>-->
                            </span>

                            <div><span class="txt-x-small">DockerHub: v{{ latestVersion.docker }}</span></div>
                            <div><span class="txt-x-small">GitHub: v{{ latestVersion.gitHub }}</span></div>
                        </li>
                        <!--<li class="text-center"><a class="txt-small blue-link" target="_blank"
                                href="https://eleven.m-pages.com/tradenote">Get Updates</a></li>-->
                    </ul>
                </div>
            </div>
        </div>
    </div>
</template>